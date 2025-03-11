;; BitForward Contract (Simplified)
;; Uses BitForward Oracle for price feeds
;; Only stores original positions with counterparty information

;; constants
;;
(define-constant contract-owner tx-sender)
(define-constant scalar u1000000)

;; errors
(define-constant err-owner-only (err u100))
(define-constant err-no-value (err u102))
(define-constant err-close-time-not-reached (err u103))
(define-constant err-close-in-past (err u104))
(define-constant err-no-position (err u105))
(define-constant err-already-has-counterparty (err u106))
(define-constant err-price-not-set (err u107))
(define-constant err-divide-by-zero (err u108))
(define-constant err-asset-not-supported (err u110))
(define-constant err-invalid-leverage (err u111))
(define-constant err-unauthorized (err u112))
(define-constant err-position-not-found (err u113))
(define-constant err-oracle-not-set (err u114))

;; data vars
;;
(define-data-var next-position-id uint u1)
(define-data-var oracle-contract (optional principal) none)  ;; Store oracle contract address

;; data maps
;;

;; Store positions by ID - now with counterparty info directly included
(define-map positions uint 
    {
        owner: principal,
        amount: uint,
        long: bool,
        premium: uint,
        open_price: uint,
        closing_time: uint,
        counterparty: (optional { id: uint, principal: principal }),  ;; Store counterparty ID and principal
        asset: (string-ascii 3),
        leverage: uint
    }
)

;; Track user's positions (principal -> list of position IDs)
(define-map user-positions principal (list 100 uint))

;; public functions
;;

;; Set or update the oracle contract address
(define-public (set-oracle-contract (new-oracle principal))
    (begin
        ;; Only contract owner can set the oracle
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set oracle-contract (some new-oracle))
        (ok new-oracle)
    )
)

;; Get the current oracle contract
(define-read-only (get-oracle-contract)
    (var-get oracle-contract)
)

;; Private function to check and get the oracle contract
(define-private (get-oracle)
    (match (var-get oracle-contract)
        oracle-principal oracle-principal
        (err err-oracle-not-set)
    )
)

;; Generate a new unique position ID
(define-private (get-next-position-id)
    (let ((current-id (var-get next-position-id)))
        (var-set next-position-id (+ current-id u1))
        current-id
    )
)

;; Add a position ID to a user's list of positions
(define-private (add-position-to-user (user principal) (position-id uint))
    (let ((current-positions (default-to (list) (map-get? user-positions user))))
        (map-set user-positions user (append current-positions position-id))
    )
)

;; Open a new position with a specific closing timestamp
(define-public (open-position (amount uint) (closing-timestamp uint) (type bool) (asset (string-ascii 3)) (premium uint) (leverage uint))
    (begin
        (asserts! (> closing-timestamp block-time) err-close-in-past)
        (asserts! (> amount u0) err-no-value)
        (asserts! (> premium u0) err-no-value)
        (asserts! (>= leverage u1) err-invalid-leverage)  ;; Leverage must be at least 1x
        
        ;; Check if asset is supported by oracle
        (let ((oracle-principal (unwrap! (get-oracle) err-oracle-not-set)))
            (asserts! (unwrap! (contract-call? oracle-principal is-supported asset) err-asset-not-supported) err-asset-not-supported)
            
            ;; Get price from oracle
            (let ((price-response (unwrap! (contract-call? oracle-principal get-price asset) err-asset-not-supported)))
                (asserts! (> price-response u0) err-price-not-set)
                
                (let (
                    ;; Calculate premium value based on amount
                    (premium-value (unwrap! (mul-fixed amount premium) err-divide-by-zero))
                    (current-time block-time)
                    (position-id (get-next-position-id))
                )
                    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

                    ;; Create the new position
                    (map-set positions position-id {
                        owner: tx-sender,
                        amount: amount,
                        long: type,
                        premium: premium-value,
                        open_price: price-response,
                        closing_time: closing-timestamp,
                        counterparty: none,  ;; No counterparty yet
                        asset: asset,
                        leverage: leverage
                    })
                    
                    ;; Add position to user's list
                    (add-position-to-user tx-sender position-id)
                    
                    (ok position-id)
                )
            )
        )
    )
)

;; Take the opposite side of an existing position
(define-public (take-position (position-id uint))
    (let 
        ((target-position (unwrap! (map-get? positions position-id) err-position-not-found)))

        ;; Check if position already has a counterparty
        (asserts! (is-none (get counterparty target-position)) err-already-has-counterparty)
        
        ;; Transfer the required amount
        (try! (stx-transfer? (get amount target-position) tx-sender (as-contract tx-sender)))
        
        ;; Update the position with counterparty info
        (map-set positions position-id 
            (merge target-position { 
                counterparty: (some { 
                    id: (get-next-position-id),  ;; Generate an ID for the counterparty
                    principal: tx-sender  ;; Store the counterparty's principal
                })
            })
        )
        
        ;; Track that this user has taken a position
        (add-position-to-user tx-sender position-id)
        
        ;; Return the counterparty ID
        (ok (get id (unwrap! (get counterparty (unwrap! (map-get? positions position-id) err-position-not-found)) err-position-not-found)))
    )
)

;; For backward compatibility (alias for take-position)
(define-public (match-position (position-id uint))
    (take-position position-id)
)

;; Close a position
(define-public (close-position (position-id uint))
    (let 
        ((target-position (unwrap! (map-get? positions position-id) err-position-not-found)))

        ;; Check if position has reached closing time
        (asserts! (>= block-time (get closing_time target-position)) err-close-time-not-reached)
        
        ;; Determine who can close the position (either original owner or counterparty)
        (asserts! 
            (or 
                (is-eq tx-sender (get owner target-position))
                (match (get counterparty target-position)
                    counterparty (is-eq tx-sender (get principal counterparty))
                    false
                )
            ) 
            err-unauthorized
        )
        
        (let ((asset (get asset target-position)))
            ;; Get oracle contract
            (let ((oracle-principal (unwrap! (get-oracle) err-oracle-not-set)))
                ;; Get current price from oracle
                (let ((close-price-response (unwrap! (contract-call? oracle-principal get-price asset) err-asset-not-supported)))
                    (asserts! (> close-price-response u0) err-price-not-set)

                    (match (get counterparty target-position)
                        counterparty-info (let (
                            (original-owner (get owner target-position))
                            (counterparty-principal (get principal counterparty-info))
                            (open-price (get open_price target-position))
                            ;; Calculate price movement percentage
                            (price-movement (if (get long target-position)
                                ;; For long positions: (close_price - open_price) / open_price
                                (unwrap! (div-fixed (- close-price-response open-price) open-price) err-divide-by-zero)
                                ;; For short positions: (open_price - close_price) / open_price
                                (unwrap! (div-fixed (- open-price close-price-response) open-price) err-divide-by-zero)
                            ))
                            ;; Apply leverage to price movement
                            (leveraged-return (unwrap! (mul-fixed price-movement (get leverage target-position)) err-divide-by-zero))
                            ;; Calculate position payout based on leveraged return
                            (position-payout (+ (get amount target-position) 
                                              (unwrap! (mul-fixed (get amount target-position) leveraged-return) err-divide-by-zero)))
                            (premium-payout (get premium target-position))
                            (total-payout (+ position-payout premium-payout))
                            ;; Calculate total collateral 
                            (total-collateral (* u2 (get amount target-position)))
                            (counterparty-payout (- total-collateral total-payout))
                        )
                            ;; Determine who gets which payout based on position type
                            (if (get long target-position)
                                (begin
                                    (try! (as-contract (stx-transfer? total-payout tx-sender original-owner)))
                                    (try! (as-contract (stx-transfer? counterparty-payout tx-sender counterparty-principal)))
                                )
                                (begin
                                    (try! (as-contract (stx-transfer? total-payout tx-sender counterparty-principal)))
                                    (try! (as-contract (stx-transfer? counterparty-payout tx-sender original-owner)))
                                )
                            )
                            ;; Delete the position
                            (map-delete positions position-id)
                            (ok total-payout)
                        )
                        ;; If not matched, return full amount to position owner
                        (begin
                            (try! (as-contract (stx-transfer? (get amount target-position) tx-sender (get owner target-position))))
                            (map-delete positions position-id)
                            (ok (get amount target-position))
                        )
                    )
                )
            )
        )
    )
)

;; Get a specific position by ID
(define-read-only (get-position (position-id uint))
    (map-get? positions position-id)
)

;; Get all positions for a user (either as owner or counterparty)
(define-read-only (get-user-positions (user principal))
    (default-to (list) (map-get? user-positions user))
)

;; Check if a user is involved in a position (either as owner or counterparty)
(define-read-only (is-position-participant (user principal) (position-id uint))
    (let ((position (map-get? positions position-id)))
        (match position
            pos (or 
                    (is-eq user (get owner pos))
                    (match (get counterparty pos)
                        cp (is-eq user (get principal cp))
                        false
                    )
                )
            false
        )
    )
)

;; private functions
;;
(define-private (div-fixed (a uint) (b uint))
    (if (is-eq b u0)
        err-divide-by-zero
        (ok (/ (* a scalar) b))
    )
)

(define-private (mul-fixed (a uint) (b uint))
    (ok (/ (* a b) scalar))
)