;; BitForward NFT Implementation - Modified version without traits
;; This version implements the same functionality but without using traits

;; =========== CONSTANTS ===========
(define-constant contract-owner tx-sender)

;; Error codes
(define-constant err-owner-only (err u300))
(define-constant err-not-token-owner (err u301))
(define-constant err-token-not-found (err u302))
(define-constant err-not-authorized (err u303))
(define-constant err-sender-not-tx-sender (err u304))

;; =========== NFT IMPLEMENTATION ===========
(define-non-fungible-token bitforward-contracts uint)

;; =========== DATA VARIABLES ===========
(define-data-var last-token-id uint u0)

;; =========== DATA MAPS ===========
;; Token metadata - direct mapping from token-id to contract-id
;; A contract-id of 0 indicates an invalid/deleted position
(define-map token-contracts uint uint)

;; Track approved contracts that can mint and manage positions
(define-map approved-contracts principal bool)

;; =========== NFT INTERFACE FUNCTIONS ===========

;; Get last token ID
(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)

;; Get token URI - returns the contract ID directly
(define-read-only (get-token-uri (token-id uint))
  (ok (some (default-to u0 (map-get? token-contracts token-id))))
)

;; Get token owner
(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? bitforward-contracts token-id))
)

;; Transfer token
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        ;; Ensure sender is the token owner
        (asserts! (is-eq (some sender) (nft-get-owner? bitforward-contracts token-id)) 
                 err-not-token-owner)
        
        ;; NEW CHECK: Ensure tx-sender is the sender (the actual token owner)
        (asserts! (is-eq tx-sender sender) err-sender-not-tx-sender)
        
        ;; Ensure position is not deleted (contract-id != 0)
        (asserts! (> (default-to u0 (map-get? token-contracts token-id)) u0) 
                 err-not-authorized)
        
        ;; Transfer the NFT
        (nft-transfer? bitforward-contracts token-id sender recipient)
    )
)

;; =========== ADMIN FUNCTIONS ===========

;; Add an approved contract that can mint and manage positions
(define-public (set-approved-contract (contract-principal principal) (is-approved bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (map-set approved-contracts contract-principal is-approved)
        (ok is-approved)
    )
)

;; Check if a contract is approved
(define-read-only (is-approved-contract (contract-principal principal))
    (default-to false (map-get? approved-contracts contract-principal))
)

;; =========== POSITION MANAGEMENT FUNCTIONS ===========

;; Mint a new NFT position (can only be called by approved contracts)
(define-public (mint-position (recipient principal) (contract-id uint))
    (begin
        ;; Ensure caller is an approved contract
        (asserts! (is-approved-contract tx-sender) err-not-authorized)
        
        ;; Ensure contract-id is not 0 (invalid)
        (asserts! (> contract-id u0) err-not-authorized)
        
        ;; Generate new token ID
        (let ((token-id (+ (var-get last-token-id) u1)))
            
            ;; Mint the NFT
            (try! (nft-mint? bitforward-contracts token-id recipient))
            
            ;; Store metadata (just contract-id)
            (map-set token-contracts token-id contract-id)
            
            ;; Update last token ID
            (var-set last-token-id token-id)
            
            (ok token-id)
        )
    )
)