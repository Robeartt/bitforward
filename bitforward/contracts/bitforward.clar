;; =========== CONSTANTS ===========
(define-constant contract-owner tx-sender)
(define-constant scalar u100000000)  ;; 1.0 with 8 decimals (for sBTC compatibility)
(define-constant premium-fee-percent u1000000)  ;; 1% fee on premium (100 * scalar / 10000)

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
(define-constant err-token-not-found (err u115))
(define-constant err-not-token-owner (err u116))
(define-constant err-invalid-status (err u117))
(define-constant err-invalid-position-type (err u122))
(define-constant err-contract-stopped (err u123))
(define-constant err-transfer-failed (err u124))
(define-constant err-payout-exceeds-pool (err u125))
(define-constant err-test (err u999))

;; =========== DATA VARIABLES ===========
(define-data-var next-contract-id uint u1)
(define-data-var is-stopped bool false)  ;; Variable to track if contract is stopped

;; =========== DATA MAPS ===========
;; Contracts map with long and short position IDs and payout information
(define-map contracts uint 
    {
        collateral-amount: uint,
        premium: int,           ;; Changed from uint to int to support negative values
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

;; Map to track approved contracts for testing
(define-map approved-contracts principal bool)

;; =========== GETTER FUNCTIONS ===========

;; Check if contract is stopped
(define-read-only (get-is-stopped)
    (var-get is-stopped)
)

;; Get a specific contract by ID
(define-read-only (get-contract (contract-id uint))
    (map-get? contracts contract-id)
)

;; Check if a contract is approved
(define-read-only (is-approved-contract (contract-principal principal))
    (default-to false (map-get? approved-contracts contract-principal))
)

;; =========== ADMIN FUNCTIONS ===========

;; Stop contract to prevent new positions from being created
(define-public (stop-contract)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set is-stopped true)
        (ok true)
    )
)

;; Generate new contract ID (simple increment)
(define-private (get-next-contract-id)
    (let ((current-id (var-get next-contract-id)))
        (var-set next-contract-id (+ current-id u1))
        current-id
    )
)

;; =========== FIXED-POINT MATH FUNCTIONS ===========
;; Original functions for uint types
(define-private (div-fixed (a uint) (b uint))
    (if (is-eq b u0)
        err-divide-by-zero
        (ok (/ (* a scalar) b))
    )
)

(define-private (mul-fixed (a uint) (b uint))
    (ok (/ (* a b) scalar))
)

;; New functions for int types
(define-private (div-fixed-int (a int) (b uint))
    (if (is-eq b u0)
        err-divide-by-zero
        (ok (/ (* a (to-int scalar)) (to-int b)))
    )
)

(define-private (mul-fixed-int (a int) (b int))
    (ok (/ (* a b) (to-int scalar)))
)

;; =========== ABSOLUTE VALUE FUNCTION ===========
(define-private (abs-int (value int))
    (if (< value 0)
        (* value -1)
        value
    )
)

;; =========== SBTC TRANSFER FUNCTIONS ===========

;; Private function to handle sBTC transfers
(define-private (transfer-sbtc (amount uint) (sender principal) (recipient principal))
    (let ((transfer-result (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer amount sender recipient none)))
        (asserts! (is-ok transfer-result) err-transfer-failed)
        (ok amount)
    )
)

;; =========== CONTRACT FUNCTIONS ===========

;; Create a new contract (either long or short position)
(define-public (create-position 
    (amount uint) 
    (closing-block uint)  
    (is-long bool) 
    (asset (string-ascii 3)) 
    (premium int)
    (long-leverage uint)
    (short-leverage uint))
    
    (begin
        ;; Check if contract is stopped
        (asserts! (not (var-get is-stopped)) err-contract-stopped)
        
        ;; Check if closing block is in the future
        (asserts! (> closing-block burn-block-height) err-close-block-in-past)
        (asserts! (> amount u0) err-no-value)
        
        ;; Validate leverage values - must be at least 1.0 (represented as scalar)
        (asserts! (>= long-leverage scalar) err-invalid-leverage)
        (asserts! (>= short-leverage scalar) err-invalid-leverage)
        
        ;; Get price from oracle
        (let
            ((price-response (contract-call? .bitforward-oracle get-price asset)))
            
            ;; Check for errors from oracle call
            (asserts! (is-ok price-response) err-asset-not-supported)
            (let ((price-value (unwrap-panic price-response)))
                (asserts! (> price-value u0) err-price-not-set)
                
                (let (
                    (contract-id (get-next-contract-id))
                )
                    ;; Transfer the amount from user to contract using sBTC
                    (try! (transfer-sbtc amount tx-sender (as-contract tx-sender)))

                    ;; Mint the NFT for creator's position
                    (let ((position-result (contract-call? .bitforward-nft mint-position tx-sender contract-id)))
                        ;; Check for errors from NFT mint
                        (asserts! (is-ok position-result) position-result)
                        (let ((position-id (unwrap-panic position-result)))
                            
                            ;; Create the contract with position IDs and initialized payout fields
                            (map-set contracts contract-id
                                {
                                    collateral-amount: amount,
                                    premium: premium,
                                    open-price: price-value,
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
    )
)

;; Take the opposite side of a contract
(define-public (take-position (contract-id uint))
  (let ((target-contract (unwrap! (map-get? contracts contract-id) err-contract-not-found)))

    ;; Ensure the contract is open
    (asserts! (is-eq (get status target-contract) status-open) err-already-has-counterparty)

    (let ((collateral-amount (get collateral-amount target-contract))
          (has-long (> (get long-id target-contract) u0)))

      ;; Transfer collateral amount from taker using sBTC
      (try! (transfer-sbtc collateral-amount tx-sender (as-contract tx-sender)))

      ;; Mint NFT for the counterparty position
      (let ((position-result (contract-call? .bitforward-nft mint-position tx-sender contract-id)))
        ;; Check for errors from NFT mint
        (asserts! (is-ok position-result) err-token-not-found)
        (let ((taker-position-id (unwrap-panic position-result)))

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
        ;; Create a price difference as int
        (price-diff (to-int (- current-price open-price)))
        ;; Create int versions of needed values
        (open-price-int (to-int open-price))
        (scalar-int (to-int scalar))
        (threshold-int (to-int liquidation-threshold))
    )
        ;; Try to calculate price movement percentage
        (match (div-fixed-int price-diff open-price)
            price-movement ;; Success case variable
            (let (
                ;; For long positions, check if price has dropped below liquidation threshold
                ;; For short positions, check if price has risen above liquidation threshold
                (liquidated (if is-long
                                (<= (+ scalar-int price-movement) (- scalar-int threshold-int))
                                (>= (+ scalar-int price-movement) (+ scalar-int threshold-int))))
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
             (price-response (contract-call? .bitforward-oracle get-price asset))
             (open-price (get open-price target-contract))
             (long-leverage (get long-leverage target-contract))
             (short-leverage (get short-leverage target-contract)))
            
            ;; Check for errors from oracle call
            (asserts! (is-ok price-response) err-asset-not-supported)
            (let ((current-price (unwrap-panic price-response)))
            
                ;; Check if contract has reached closing block OR either position would be liquidated
                (asserts! (or 
                          (>= burn-block-height (get closing-block target-contract))
                          (is-liquidating? true open-price current-price long-leverage)
                          (is-liquidating? false open-price current-price short-leverage)) 
                        err-close-block-not-reached)
            
                ;; Get the owners of both positions
                (let 
                    ((long-owner-result (contract-call? .bitforward-nft get-owner long-id))
                     (short-owner-result (contract-call? .bitforward-nft get-owner short-id)))
                    
                    ;; Check for errors from NFT owner queries
                    (asserts! (is-ok long-owner-result) err-token-not-found)
                    (asserts! (is-ok short-owner-result) err-token-not-found)
                    
                    (let
                        ((long-owner-option (unwrap-panic long-owner-result))
                         (short-owner-option (unwrap-panic short-owner-result)))
                        
                        ;; Check that we got Some values, not None
                        (asserts! (is-some long-owner-option) err-token-not-found)
                        (asserts! (is-some short-owner-option) err-token-not-found)
                        
                        (let
                            ((long-owner (unwrap-panic long-owner-option))
                             (short-owner (unwrap-panic short-owner-option)))
                            
                            (asserts! (> current-price u0) err-price-not-set)

                            (let 
                                ((collateral-amount (get collateral-amount target-contract))
                                 (premium (get premium target-contract))
                                 
                                 ;; Calculate price movement percentage (as int)
                                 ;; First convert values to int for calculation
                                 (price-diff (to-int (- current-price open-price)))
                                 (open-price-int (to-int open-price))
                                 ;; Calculate price movement
                                 (price-movement-result (div-fixed-int price-diff open-price))
                                 (price-movement (unwrap! price-movement-result err-divide-by-zero))
                                 
                                 ;; Calculate long position P&L (all as int)
                                 (leverage-int (to-int long-leverage))
                                 (collateral-int (to-int collateral-amount))
                                 ;; Calculate PnL steps
                                 (long-pnl-result (mul-fixed-int price-movement leverage-int))
                                 (long-pnl (unwrap! long-pnl-result err-divide-by-zero))
                                 (long-profit-result (mul-fixed-int long-pnl collateral-int))
                                 (long-profit (unwrap! long-profit-result err-divide-by-zero))
                                 
                                 ;; Determine premium direction based on sign
                                 (premium-to-long (if (>= premium 0) premium 0))
                                 (premium-to-short (if (< premium 0) (abs-int premium) 0))
                                 
                                 ;; Calculate fee on absolute premium value
                                 (premium-abs (abs-int premium))
                                 (premium-fee-percent-int (to-int premium-fee-percent))
                                 (premium-fee-result (mul-fixed-int premium-abs premium-fee-percent-int))
                                 (premium-fee (unwrap! premium-fee-result err-divide-by-zero))
                                 
                                 ;; Adjust premium after fee (subtract fee from recipient)
                                 (long-premium-after-fee (if (>= premium 0) 
                                                         (to-uint (- premium-to-long premium-fee))
                                                         (to-uint premium-to-long)))
                                 (short-premium-after-fee (if (< premium 0)
                                                          (to-uint (- premium-to-short premium-fee))
                                                          (to-uint premium-to-short)))
                                 
                                 ;; Total available pool (both collaterals)
                                 (total-available-pool (* collateral-amount u2))
                                 
                                 ;; Base payouts start with collateral amount
                                 (long-base collateral-int)
                                 (short-base collateral-int)
                                 
                                 ;; Add profit/loss to base
                                 (long-with-pnl (+ long-base long-profit))
                                 (short-with-pnl (- short-base long-profit))
                                 
                                 ;; Add premium to payouts (converting back to uint)
                                 (long-premium-after-fee-int (to-int long-premium-after-fee))
                                 (short-premium-after-fee-int (to-int short-premium-after-fee))
                                 (long-total (+ long-with-pnl long-premium-after-fee-int))
                                 (short-total (+ short-with-pnl short-premium-after-fee-int))
                                 
                                 ;; Ensure no negative payouts - minimum is 0
                                 (long-payout (if (>= long-total 0) (to-uint long-total) u0))
                                 (short-payout (if (>= short-total 0) (to-uint short-total) u0))
                                 
                                 ;; The fee is always positive
                                 (fee-payout (to-uint premium-fee)))
                                
                                ;; ASSERT: Verify that total payouts don't exceed the available pool
                                (asserts! (<= (+ long-payout short-payout fee-payout) total-available-pool) 
                                          err-payout-exceeds-pool)
                                
                                ;; Distribute payouts to position owners and fee to recipient using sBTC
                                (try! (as-contract (transfer-sbtc long-payout tx-sender long-owner)))
                                (try! (as-contract (transfer-sbtc short-payout tx-sender short-owner)))
                                (try! (as-contract (transfer-sbtc fee-payout tx-sender contract-owner)))
                                
                                ;; Update contract with payout information and status
                                (map-set contracts contract-id
                                    (merge target-contract { 
                                        status: status-closed,
                                        close-price: current-price,
                                        long-payout: long-payout,
                                        short-payout: short-payout
                                    }))
                                
                                ;; Return success
                                (ok true)
                            )
                        )
                    )
                )
            )
        )
    )
)