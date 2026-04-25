# Manual Bug Exploration Checklist

**Validates: Requirements 1.1-1.36**

**CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist  
**DO NOT attempt to fix the bugs when you find them**

This checklist helps surface counterexamples that demonstrate the 29 bugs exist across all categories.

---

## Category 1: Payment & Transaction Bugs

### Bug 1.1: Mobile Deposit/Withdraw Input Field Responsiveness
- [ ] **Test**: Open deposit page on mobile device (phone-sized screen)
- [ ] **Action**: Attempt to enter amount in input field
- [ ] **Expected Failure**: Input field overflows form box, extends beyond boundaries
- [ ] **Counterexample Found**: _______________________________________________

### Bug 1.2: Payment Page Transaction Data Display
- [ ] **Test**: Navigate to payment page
- [ ] **Action**: Observe transaction data table
- [ ] **Expected Failure**: No transaction data shown, empty table or "No data" message
- [ ] **Counterexample Found**: _______________________________________________

### Bug 1.3: Mobile Navigation Loading States
- [ ] **Test**: Navigate between pages on phone-sized device
- [ ] **Action**: Observe loading spinner behavior
- [ ] **Expected Failure**: Infinite spinner without content loading
- [ ] **Counterexample Found**: _______________________________________________

### Bug 1.4: Admin Platform Balance Accuracy
- [ ] **Test**: Check admin platform balance
- [ ] **Action**: Compare displayed balance to actual Chapa balance
- [ ] **Expected Failure**: Shows incorrect/hardcoded 