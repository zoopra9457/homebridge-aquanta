import {
  AccessoryPlugin,
  CharacteristicGetCallback,
  HAP,
  Logging,
  Service,
  CharacteristicEventTypes, CharacteristicValue, CharacteristicSetCallback,
} from 'homebridge';
import {AquantaAPIController} from './aquantaAPIController';
import { LIB_VERSION } from './settings';

export class AquantaMulti implements AccessoryPlugin {
  private readonly hap: HAP;
  private readonly log: Logging;
  name: string;
  private aquantaApiController: AquantaAPIController;
  private serialNumber?;

  private readonly boostSwitchService: Service;
  private readonly awaySwitchService: Service;
  private readonly temperatureService: Service;
  private readonly informationService: Service;

  constructor(hap: HAP, log: Logging, name: string, aquantaAPIController: AquantaAPIController) {
    this.hap = hap;
    this.log = log;
    this.name = name;
    this.aquantaApiController = aquantaAPIController;

    this.temperatureService = new hap.Service.TemperatureSensor('Temperature' );
    this.temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        this.aquantaApiController.updateData().then(() => {
          this.log.debug(`Updating Temperature: ${this.aquantaApiController.getTemperature()}`);
          callback(undefined, this.aquantaApiController.getTemperature());
        });
      });

    this.boostSwitchService = new hap.Service.Switch('Boost Mode', 'Boost');
    this.boostSwitchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        this.log.debug('Current boost state boost mode: ' + (this.aquantaApiController.getAwayActive()? 'ON': 'OFF'));
        callback(undefined, this.aquantaApiController.getBoostActive());
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.info('Switch boost state was set to: ' + (value? 'ON': 'OFF'));
        if ( value ) {
          this.aquantaApiController.turnOnBoost();
        } else {
          this.aquantaApiController.turnOffBoost();
        }
        callback();
      });

    this.awaySwitchService = new hap.Service.Switch('Away Mode', 'Away');
    this.awaySwitchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        this.log.debug('Current away state away mode: ' + (this.aquantaApiController.getAwayActive()? 'ON': 'OFF'));
        callback(undefined, this.aquantaApiController.getAwayActive());
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.info('Switch away state was set to: ' + (value? 'ON': 'OFF'));
        if ( value ) {
          this.aquantaApiController.turnOnAway();
        } else {
          this.aquantaApiController.turnOffAway();
        }
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Aquanta')
      .setCharacteristic(hap.Characteristic.Model, 'Aquanta')
      .setCharacteristic(hap.Characteristic.FirmwareRevision, LIB_VERSION)
      .setCharacteristic(this.hap.Characteristic.SerialNumber, this.aquantaApiController.getDevice());

    this.dataPolling();
    this.log.info('Temperature Sensor \'%s\' created!', name);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.temperatureService,
      this.boostSwitchService,
      this.awaySwitchService,
    ];
  }

  dataPolling () {
    setInterval(() => {
      this.log.debug('Updating data via interval');
      this.aquantaApiController.updateData().then(() => {
        this.temperatureService.updateCharacteristic(this.hap.Characteristic.CurrentTemperature,
          this.aquantaApiController.getTemperature());
        this.boostSwitchService.updateCharacteristic(this.hap.Characteristic.On,
          this.aquantaApiController.getBoostActive());
        this.awaySwitchService.updateCharacteristic(this.hap.Characteristic.On,
          this.aquantaApiController.getAwayActive());
      });
    }, 600000); // 600000 = 10 min | 300000 = 5 min | 60000 = 1 min
  }
}

