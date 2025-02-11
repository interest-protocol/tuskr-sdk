import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiObjectId, normalizeSuiAddress } from '@mysten/sui/utils';
import { has } from 'ramda';
import invariant from 'tiny-invariant';

import { Modules, TYPES } from './constants';
import {
  Network,
  OwnedObject,
  Package,
  SdkConstructorArgs,
  SharedObject,
  SharedObjects,
} from './tuskr.types';
import { getSdkDefaultArgs } from './utils';

export class SDK {
  packages: Package;
  sharedObjects: SharedObjects;
  modules = Modules;
  types: (typeof TYPES)[keyof typeof TYPES];

  #network: Network;
  #rpcUrl: string;

  client: SuiClient;

  lstType: string | undefined;

  constructor(args: SdkConstructorArgs | undefined | null = null) {
    const data = {
      ...getSdkDefaultArgs(),
      ...args,
    };

    invariant(
      data.fullNodeUrl,
      'You must provide fullNodeUrl for this specific network'
    );

    invariant(
      data.packages,
      'You must provide package addresses for this specific network'
    );

    invariant(
      data.sharedObjects,
      'You must provide sharedObjects for this specific network'
    );

    invariant(
      data.network,
      'You must provide network for this specific network'
    );

    invariant(data.types, 'You must provide types for this specific network');

    this.#network = data.network;
    this.#rpcUrl = data.fullNodeUrl;
    this.packages = data.packages;
    this.sharedObjects = data.sharedObjects;
    this.types = data.types;
    this.client = new SuiClient({ url: data.fullNodeUrl });
  }

  public networkConfig() {
    return {
      rpcUrl: this.#rpcUrl,
      network: this.#network,
    };
  }

  public getAllowedVersions(tx: Transaction) {
    return tx.moveCall({
      package: this.packages.TUSKR,
      module: this.modules.AllowedVersions,
      function: 'get_allowed_versions',
      arguments: [
        this.sharedObject(tx, this.sharedObjects.TUSKR_AV({ mutable: false })),
      ],
    });
  }

  assertObjectId(obj: OwnedObject | SharedObject) {
    if (typeof obj === 'string') {
      invariant(isValidSuiObjectId(obj), 'Invalid object id');
    } else if (typeof obj === 'object' && 'objectId' in obj) {
      invariant(isValidSuiObjectId(obj.objectId), 'Invalid object id');
    }
  }

  assertNotZeroAddress(address: string) {
    invariant(
      normalizeSuiAddress(address) !== normalizeSuiAddress('0x0'),
      'Invalid address: 0x0'
    );
  }

  ownedObject(tx: Transaction, obj: OwnedObject) {
    if (has('objectId', obj) && has('version', obj) && has('digest', obj)) {
      return tx.objectRef(obj);
    }

    return typeof obj === 'string' ? tx.object(obj) : obj;
  }

  sharedObject(tx: Transaction, obj: SharedObject) {
    if (typeof obj === 'string') {
      return tx.object(obj);
    }

    return tx.sharedObjectRef(obj);
  }
}
