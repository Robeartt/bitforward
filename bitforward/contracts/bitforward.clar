;; =========== CONSTANTS ===========
(define-constant contract-owner tx-sender)
(define-constant scalar u1000000)
(define-constant premium-fee-percent u100)  ;; 0.01% fee on premium

;; Contract status constants
(define-constant status-open u1)
(define-constant status-filled u2)
(define-constant status-closed u3)

;; =========== ERROR CODES ===========
(define-constant err-owner-only (err u100))
(define-constant err-no-value (err u102))
(define-constant err-close-block-not-reached (err u103))
(define-constant err-close-block-in-past (err u104))
(define-constant err-no-position (err u105))
(define-constant err-already-has-counterparty (err u106))
(define-constant err-price-not-set (err u107))
(define-constant err-divide-by-zero (err u108))
(define-constant err-asset-not-supported (err u110))
(define-constant err-invalid-leverage (err u111))
(define-constant err-unauthorized (err u112))
(define-constant err-contract-not-found (err u113))
(define-constant err-oracle-not-set (err u114))
(define-constant err-token-not-found (err u115))
(define-constant err-not-token-owner (err u116))
(define-constant err-invalid-status (err u117))
(define-constant err-invalid-position-type (err u122))

;; =========== DATA VARIABLES ===========
(define-data-var next-contract-id uint u1)
;; We keep these variables for compatibility but mainly use direct contract calls 
(define-data-var fee-recipient-address principal contract-owner)
(define-data-var premium-fee-rate uint premium-fee-percent)

;; =========== DATA MAPS ===========
;; Contracts map with long and short position IDs and payout information
(define-map contracts uint 
    {
        collateral-amount: uint,
        premium: uint,
        premium-fee: uint,
        open-price: uint,
        close-price: uint,
        closing-block: uint,
        asset: (string-ascii 3),
        long-leverage: uint,
        short-leverage: uint,
        status: uint,
        long-id: uint,
        short-id: uint,
        long-payout: uint,
        short-payout: uint
    }
)

;; Update fee settings
(define-public (update-fee-settings
    (recipient principal)
    (fee-rate uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set fee-recipient-address recipient)
        (var-set premium-fee-rate fee-rate)
        (ok true)
    )
)

;; Get contract settings
(define-read-only (get-settings)
    {
        fee-recipient: (var-get fee-recipient-address),
        premium-fee-rate: (var-get premium-fee-rate)
    }
)

;; Generate new contract ID (simple increment)
(define-private (get-next-contract-id)
    (let ((current-id (var-get next-contract-id)))
        (var-set next-contract-id (+ current-id u1))
        current-id
    )
)

;; =========== FIXED-POINT MATH FUNCTIONS ===========
(define-private (div-fixed (a uint) (b uint))
    (if (is-eq b u0)
        err-divide-by-zero
        (ok (/ (* a scalar) b))
    )
)

(define-private (mul-fixed (a uint) (b uint))
    (ok (/ (* a b) scalar))
)

;; =========== CONTRACT FUNCTIONS ===========

;; Create a new contract (either long or short position)
(define-public (create-position 
    (amount uint) 
    (closing-block uint)  
    (is-long bool) 
    (asset (string-ascii 3)) 
    (premium uint) 
    (long-leverage uint)
    (short-leverage uint))
    
    (begin
        ;; Check if closing block is in the future
        (asserts! (> closing-block burn-block-height) err-close-block-in-past)
        (asserts! (> amount u0) err-no-value)
        (asserts! (> premium u0) err-no-value)
        
        ;; Validate leverage values - must be at least 1.0 (represented as scalar)
        (asserts! (>= long-leverage scalar) err-invalid-leverage)
        (asserts! (>= short-leverage scalar) err-invalid-leverage)
        
        ;; Get price from oracle using direct contract call
        (let ((price-response (unwrap! (contract-call? .bitforward-oracle get-price asset) err-asset-not-supported)))
            (asserts! (> price-response u0) err-price-not-set)
            
            (let (
                (contract-id (get-next-contract-id))
                (fee-rate (var-get premium-fee-rate))
                (premium-fee (/ (* premium fee-rate) scalar))
            )
                ;; Transfer the amount from user to contract
                (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

                ;; Mint the NFT for creator's position using direct contract call
                (let ((position-id (unwrap! (contract-call? .bitforward-nft mint-position tx-sender contract-id) err-token-not-found)))
                    
                    ;; Create the contract with position IDs and initialized payout fields
                    (map-set contracts contract-id
                        {
                            collateral-amount: amount,
                            premium: premium,
                            premium-fee: premium-fee,
                            open-price: price-response,
                            close-price: u0,
                            closing-block: closing-block,
                            asset: asset,
                            long-leverage: long-leverage,
                            short-leverage: short-leverage,
                            status: status-open,
                            long-id: (if is-long position-id u0),
                            short-id: (if is-long u0 position-id),
                            long-payout: u0,
                            short-payout: u0
                        }
                    )
                    
                    ;; Return the position ID created for the user
                    (ok position-id)
                )
            )
        )
    )
)

;; Take the opposite side of a contract
(define-public (take-position (contract-id uint))
  (let ((target-contract (unwrap! (map-get? contracts contract-id) err-contract-not-found)))

    ;; Ensure the contract is open
    (asserts! (is-eq (get status target-contract) status-open) err-already-has-counterparty)

    (let ((collateral-amount (get collateral-amount target-contract))
          (has-long (> (get long-id target-contract) u0)))

      ;; Transfer collateral amount from taker
      (try! (stx-transfer? collateral-amount tx-sender (as-contract tx-sender)))

      ;; Mint NFT for the counterparty position
      (let ((taker-position-id (unwrap! (contract-call? .bitforward-nft mint-position tx-sender contract-id) err-token-not-found)))

        ;; Update contract status to FILLED and record position IDs
        (map-set contracts contract-id
          (merge target-contract {
            status: status-filled,
            long-id: (if has-long (get long-id target-contract) taker-position-id),
            short-id: (if has-long taker-position-id (get short-id target-contract))
          }))

        (ok taker-position-id)
      )
    )
  )
)

;; Check if a position would be liquidated at the current price
(define-private (is-liquidating? 
    (is-long bool) 
    (open-price uint) 
    (current-price uint) 
    (leverage uint))
    
    (let (
        ;; Calculate liquidation threshold based on leverage (adjusted for scalar)
        ;; Formula: 1 / leverage (with all values already scaled)
        (liquidation-threshold (/ scalar leverage))
    )
        ;; Try to calculate price movement percentage
        (match (div-fixed (- current-price open-price) open-price)
            price-movement ;; Success case variable
            (let (
                ;; For long positions, check if price has dropped below liquidation threshold
                ;; For short positions, check if price has risen above liquidation threshold
                (liquidated (if is-long
                                (<= (+ scalar price-movement) (- scalar liquidation-threshold))
                                (>= (+ scalar price-movement) (+ scalar liquidation-threshold))))
            )
                liquidated
            )
            error-code ;; Error case variable
            false
        )
    )
)

;; Close a contract and payout both positions with fee
(define-public (close-contract (contract-id uint))
    (let 
        ((target-contract (unwrap! (map-get? contracts contract-id) err-contract-not-found)))

        ;; Check if contract is filled (both positions exist)
        (asserts! (is-eq (get status target-contract) status-filled) err-invalid-status)
        
        (let
            ((long-id (get long-id target-contract))
             (short-id (get short-id target-contract))
             (asset (get asset target-contract))
             (current-price (unwrap! (contract-call? .bitforward-oracle get-price asset) err-asset-not-supported))
             (open-price (get open-price target-contract))
             (long-leverage (get long-leverage target-contract))
             (short-leverage (get short-leverage target-contract))
             (close-price current-price)) ;; Use current price as closing price
        
            ;; Check if contract has reached closing block OR either position would be liquidated
            (asserts! (or 
                      (>= burn-block-height (get closing-block target-contract))
                      (is-liquidating? true open-price current-price long-leverage)
                      (is-liquidating? false open-price current-price short-leverage)) 
                    err-close-block-not-reached)
        
            ;; Get the owners of both positions - properly handle the double unwrapping
            (let 
                ((long-owner-result (unwrap! (contract-call? .bitforward-nft get-owner long-id) err-token-not-found))
                 (short-owner-result (unwrap! (contract-call? .bitforward-nft get-owner short-id) err-token-not-found)))
                
                (let
                    ((long-owner (unwrap! long-owner-result err-token-not-found))
                     (short-owner (unwrap! short-owner-result err-token-not-found)))
                    
                    (asserts! (> close-price u0) err-price-not-set)

                    (let 
                        ((collateral-amount (get collateral-amount target-contract))
                         (premium (get premium target-contract))
                         (premium-fee (get premium-fee target-contract))
                         ;; Calculate total pool (2x collateral)
                         (total-pool (* collateral-amount u2))
                         ;; Premium after fee deduction
                         (premium-after-fee (- premium premium-fee))
                         ;; Calculate price movement percentage
                         (price-movement (unwrap! (div-fixed (- close-price open-price) open-price) err-divide-by-zero))
                         ;; Calculate long position P&L
                         (long-pnl (unwrap! (mul-fixed price-movement long-leverage) err-divide-by-zero))
                         (long-profit (unwrap! (mul-fixed collateral-amount long-pnl) err-divide-by-zero))
                         ;; Calculate final payouts
                         (long-payout (+ collateral-amount long-profit premium-after-fee))
                         (short-payout (- total-pool long-payout)))
                        
                        ;; Distribute payouts to position owners and fee to recipient
                        (try! (as-contract (stx-transfer? long-payout tx-sender long-owner)))
                        (try! (as-contract (stx-transfer? short-payout tx-sender short-owner)))
                        (try! (as-contract (stx-transfer? premium-fee tx-sender contract-owner)))
                        
                        ;; Update contract with payout information and status
                        (map-set contracts contract-id
                            (merge target-contract { 
                                status: status-closed,
                                close-price: close-price,
                                long-payout: long-payout,
                                short-payout: short-payout
                            }))
                        
                        ;; Return the payout amounts and fee
                        (ok {
                            long-payout: long-payout,
                            short-payout: short-payout,
                            premium-fee: premium-fee
                        })
                    )
                )
            )
        )
    )
)

;; Get a specific contract by ID
(define-read-only (get-contract (contract-id uint))
    (map-get? contracts contract-id)
)