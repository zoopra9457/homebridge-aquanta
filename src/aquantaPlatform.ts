import {AccessoryPlugin, API, HAP, Logging, PlatformConfig, StaticPlatformPlugin} from 'homebridge';
import {AquantaAPIController} from './aquantaAPIController';
import {AquantaMulti} from './aquantaMulti';

import { PLATFORM_NAME } from './settings';

let hap: HAP;

export = (api: API) => {
  hap = api.hap;

  api.registerPlatform(PLATFORM_NAME, AquantaPlatform);
};

class AquantaPlatform implements StaticPlatformPlugin {
  private readonly log: Logging;
  private config;
  private readonly aquantaApiController: AquantaAPIController;

  constructor(log: Logging, config: PlatformConfig) {
    this.log = log;
    this.config = config;

    this.aquantaApiController = new AquantaAPIController(log, config);

    log.info('Aquanta platform finished initializing!');
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {

    this.aquantaApiController.updateData().then(() => {
      callback([
        new AquantaMulti(hap, this.log, 'Aquanta', this.aquantaApiController),
      ]);
    });
  }
}
