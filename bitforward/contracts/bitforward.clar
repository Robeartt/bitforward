;; title: bitforward
;; version:
;; summary:
;; description:

;; traits
;;

;; token definitions
;;

;; constants
;;
(define-constant contract-owner tx-sender)

;; errors
(define-constant err-owner-only (err u100))
(define-constant err-already-has-position (err u101))
(define-constant err-no-value (err u102))
(define-constant err-close-height-not-reached (err u103))
(define-constant err-close-in-past (err u104))
(define-constant err-no-position (err u105))
(define-constant err-already-matched (err u106))
(define-constant err-price-not-set (err u107))

;; data vars
;;
(define-data-var current-price uint u0)

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
    }
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

(define-public (open-position (amount uint) (close-at uint))
    (begin
        (asserts! (> close-at u0) err-close-in-past)
        (asserts! (> amount u0) err-no-value)
        (asserts! (> (var-get current-price) u0) err-price-not-set)
        (asserts! (is-none (get-position tx-sender)) err-already-has-position)
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        (map-set positions tx-sender {
            amount: amount,
            long: true,
            premium: u0,
            open_value: (* amount (var-get current-price)),
            open_block: stacks-block-height,
            closing_block: (+ stacks-block-height close-at),
            matched: none,
        })
        (ok "position opened")
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
            long: false,
            premium: u0,
            open_value: (get open_value target-position),
            open_block: (get open_block target-position),
            closing_block: (get closing_block target-position),
            matched: (some position),
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
         (close-price (var-get current-price)))

        (asserts! (>= stacks-block-height (get closing_block target-position)) err-close-height-not-reached)
        (asserts! (> close-price u0) err-price-not-set)

        (match (get matched target-position)
            matched-principal (let (
                (matched-position (unwrap! (get-position matched-principal) err-no-position))
                (hedge-position-payout (/ (get open_value target-position) close-price))
                (premium-payout (get premium target-position))
                (total-hedge-payout (+ hedge-position-payout premium-payout))
                (total-collateral (* u2 (get amount target-position)))
                (price-exposure-payout (- total-collateral total-hedge-payout))
            )
                ;; Pay the hedge position (matched position with long: false)
                (if (get long matched-position)
                    ;; If matched position is price-exposed, then target position is hedged
                    (begin
                        (try! (as-contract (stx-transfer? total-hedge-payout tx-sender position)))
                        (try! (as-contract (stx-transfer? price-exposure-payout tx-sender matched-principal)))
                    )
                    ;; If matched position is hedged, then target position is price-exposed
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

(define-read-only (get-price)
    (var-get current-price)
)

;; private functions
;;