export declare class Err extends Error {
    inner: Error | undefined;
    constructor(message: string, inner?: Error);
}
export declare class ErrCannotSignSingleTransaction extends Err {
    constructor();
}
export declare class ErrAccountNotConnected extends Err {
    constructor();
}
export declare class ErrCannotEstablishHandshake extends Err {
    constructor();
}
export declare class ErrInstantiationFailed extends Err {
    constructor();
}
export declare class ErrWalletWindowNotInstantiated extends Err {
    constructor();
}
export declare class ErrProviderNotInitialized extends Err {
    constructor();
}
export declare class ErrCouldNotLogin extends Err {
    constructor();
}
export declare class ErrTransactionCancelled extends Err {
    constructor();
}
export declare class ErrCouldNotSignTransactions extends Err {
    constructor();
}
export declare class ErrCouldNotGuardTransactions extends Err {
    constructor();
}
export declare class ErrCouldNotSignMessage extends Err {
    constructor();
}
