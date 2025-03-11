;;by default, get_price is all in USD. 

;; constants
;;
(define-constant contract-owner tx-sender)
(define-constant scalar u1000000)
(define-constant oracle-provider 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)  ;; Replace with your oracle provider address

;; errors
(define-constant err-owner-only (err u100))
(define-constant err-already-has-position (err u101))
(define-constant err-no-value (err u102))
(define-constant err-close-height-not-reached (err u103))
(define-constant err-close-in-past (err u104))
(define-constant err-no-position (err u105))
(define-constant err-already-matched (err u106))
(define-constant err-price-not-set (err u107))
(define-constant err-divide-by-zero (err u108))
(define-constant err-unauthorized-oracle (err u109))
(define-constant err-currency-not-supported (err u110))

;; data vars
;;
(define-data-var current-price uint u0)
(define-data-var current-premium uint u30000)

;; Define supported currencies map (using currency codes as keys)
(define-map supported-currencies (string-ascii 3) bool)

;; Define price feeds for different currencies
(define-map price-feeds (string-ascii 3) uint)

;; data maps
;;
(define-map positions principal 
    {
        amount: uint,
        long: bool,
        premium: uint,
        open_value: uint,
        open_block: uint,
        closing_block: uint,
        matched: (optional principal),
        currency: (string-ascii 3)
    }
)

;; Initialize supported currencies
(define-public (initialize-currencies)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (map-set supported-currencies "USD" true)
        (map-set supported-currencies "CAD" true)
        (map-set supported-currencies "EUR" true)
        (map-set supported-currencies "GBP" true)
        (map-set supported-currencies "JPY" true)
        (map-set supported-currencies "CNY" true)
        (map-set supported-currencies "AUD" true)
        (ok true)
    )
)

;; Oracle update function - allows the oracle provider to update prices
(define-public (update-price-feed (currency (string-ascii 3)) (new-price uint))
    (begin
        ;; Check if the caller is the authorized oracle provider
        (asserts! (is-eq tx-sender oracle-provider) err-unauthorized-oracle)
        ;; Check if the currency is supported
        (asserts! (default-to false (map-get? supported-currencies currency)) err-currency-not-supported)
        ;; Update the price feed for this currency
        (map-set price-feeds currency new-price)
        ;; If this is USD, also update the legacy current-price for backward compatibility
        (if (is-eq currency "USD")
            (var-set current-price new-price)
            true
        )
        (ok new-price)
    )
)

;; Get price for a specific currency
(define-read-only (get-price-for-currency (currency (string-ascii 3)))
    (begin
        (asserts! (default-to false (map-get? supported-currencies currency)) err-currency-not-supported)
        (ok (default-to u0 (map-get? price-feeds currency)))
    )
)

;; public functions
;;
(define-public (set-price (new-price uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (> new-price u0) err-no-value)
        (var-set current-price new-price)
        (ok new-price)
    )
)

(define-public (set-premium (new-premium uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set current-premium new-premium)
        (ok new-premium)
    )
)

(define-public (open-position (amount uint) (close-at uint) (type bool) (currency (string-ascii 3)))
    (begin
        (asserts! (> close-at u0) err-close-in-past)
        (asserts! (> amount u0) err-no-value)
        (asserts! (default-to false (map-get? supported-currencies currency)) err-currency-not-supported)
        (asserts! (> (default-to u0 (map-get? price-feeds currency)) u0) err-price-not-set)
        (asserts! (is-none (get-position tx-sender)) err-already-has-position)
        
        (let (
            (currency-price (default-to u0 (map-get? price-feeds currency)))
            (open-value (unwrap! (mul-fixed amount currency-price) err-divide-by-zero))
            (premium (unwrap! (mul-fixed amount (var-get current-premium)) err-divide-by-zero))
        )
            (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

            (map-set positions tx-sender {
                amount: amount,
                long: type,
                premium: premium,
                open_value: open-value,
                open_block: stacks-block-height,
                closing_block: (+ stacks-block-height close-at),
                matched: none,
                currency: currency
            })
            (ok "position opened")
        )
    )
)

(define-public (match-position (position principal))
    (let 
        ((target-position (unwrap! (get-position position) err-no-position)))

        (asserts! (is-none (get-position tx-sender)) err-already-has-position)
        (asserts! (is-none (get matched target-position)) err-already-matched)
        
        (try! (stx-transfer? (get amount target-position) tx-sender (as-contract tx-sender)))
        (map-set positions tx-sender {
            amount: (get amount target-position),
            long: (not (get long target-position)),
            premium: (get premium target-position),
            open_value: (get open_value target-position),
            open_block: (get open_block target-position),
            closing_block: (get closing_block target-position),
            matched: (some position),
            currency: (get currency target-position)
        })
        
        (map-set positions position 
            (merge target-position { matched: (some tx-sender) })
        )
        
        (ok "position matched")
    )
)

(define-public (close-position (position principal))
    (let 
        ((target-position (unwrap! (get-position position) err-no-position))
         (currency (get currency target-position))
         (close-price (default-to u0 (map-get? price-feeds currency))))

        (asserts! (>= stacks-block-height (get closing_block target-position)) err-close-height-not-reached)
        (asserts! (> close-price u0) err-price-not-set)

        (match (get matched target-position)
            matched-principal (let (
                (matched-position (unwrap! (get-position matched-principal) err-no-position))
                ;; Calculate hedge position payout using fixed-point division
                (hedge-position-payout (unwrap! (div-fixed (get open_value target-position) close-price) err-divide-by-zero))
                (premium-payout (get premium target-position))
                (total-hedge-payout (+ hedge-position-payout premium-payout))
                ;; Calculate total collateral using fixed-point multiplication
                (total-collateral (* u2 (get amount target-position)))
                (price-exposure-payout (- total-collateral total-hedge-payout))
            )
                (if (get long matched-position)
                    (begin
                        (try! (as-contract (stx-transfer? total-hedge-payout tx-sender position)))
                        (try! (as-contract (stx-transfer? price-exposure-payout tx-sender matched-principal)))
                    )
                    (begin
                        (try! (as-contract (stx-transfer? total-hedge-payout tx-sender matched-principal)))
                        (try! (as-contract (stx-transfer? price-exposure-payout tx-sender position)))
                    )
                )
                (map-delete positions matched-principal)
                (map-delete positions position)
                (ok total-hedge-payout)
            )
            ;; If not matched, return full amount to position owner
            (begin
                (try! (as-contract (stx-transfer? (get amount target-position) tx-sender position)))
                (map-delete positions position)
                (ok (get amount target-position))
            )
        )
    )
)

;; read only functions
;;
(define-read-only (get-position (user principal))
    (map-get? positions user)
)

;;Available only for backward compatibility
;;
(define-read-only (get-price)
   (var-get current-price)
)

(define-read-only (get-premium)
    (var-get current-premium)
)

(define-read-only (is-currency-supported (currency (string-ascii 3)))
    (default-to false (map-get? supported-currencies currency))
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