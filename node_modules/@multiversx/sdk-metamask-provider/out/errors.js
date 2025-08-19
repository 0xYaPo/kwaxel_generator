export class Err extends Error {
    constructor(message, inner) {
        super(message);
        this.inner = undefined;
        this.inner = inner;
    }
}
export class ErrCannotSignSingleTransaction extends Err {
    constructor() {
        super('Cannot sign single transaction.');
    }
}
export class ErrAccountNotConnected extends Err {
    constructor() {
        super('Account is not connected.');
    }
}
export class ErrCannotEstablishHandshake extends Err {
    constructor() {
        super('Handshake could not be established');
    }
}
export class ErrInstantiationFailed extends Err {
    constructor() {
        super('Error: Instantiation failed: Use CrossWindowProvider.getInstance() instead of new.');
    }
}
export class ErrWalletWindowNotInstantiated extends Err {
    constructor() {
        super('Wallet window is not instantiated');
    }
}
export class ErrProviderNotInitialized extends Err {
    constructor() {
        super('Wallet cross window provider is not initialised, call init() first');
    }
}
export class ErrCouldNotLogin extends Err {
    constructor() {
        super('Could not login');
    }
}
export class ErrTransactionCancelled extends Err {
    constructor() {
        super('Transaction canceled.');
    }
}
export class ErrCouldNotSignTransactions extends Err {
    constructor() {
        super('Could not sign transactions');
    }
}
export class ErrCouldNotGuardTransactions extends Err {
    constructor() {
        super('Could not guard transactions');
    }
}
export class ErrCouldNotSignMessage extends Err {
    constructor() {
        super('Could not sign message');
    }
}
//# sourceMappingURL=errors.js.map