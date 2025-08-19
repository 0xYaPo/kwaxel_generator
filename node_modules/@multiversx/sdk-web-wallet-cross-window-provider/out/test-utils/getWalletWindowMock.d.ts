/// <reference types="jest" />
export interface WalletWindowMockType {
    close: jest.Func;
    postMessage: jest.Func;
}
export declare const getWalletWindowMock: () => WalletWindowMockType;
