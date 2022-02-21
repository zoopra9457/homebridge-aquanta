import {Logging, PlatformConfig} from 'homebridge';
import {add, format} from 'date-fns';
import axios from 'axios';
import {AQUANTA_GOOGLE_KEY} from './settings';

const AquantaClient = axios.create({
  baseURL: 'https://portal.aquanta.io/',
  timeout: 3000,
});
const GoogleClient = axios.create({
  baseURL: 'https://www.googleapis.com/',
  timeout: 3000,
});

export class AquantaAPIController {
  private aquantaToken?;
  private readonly log: Logging;
  private config;

  private temperature = 0;
  private boostActive = false;
  private awayActive = false;
  private boostDuration = 0.5;
  private deviceId;
  private device;

  constructor(log: Logging, config: PlatformConfig) {
    this.log = log;
    this.config = config;
    this.updateData;
  }

  public getTemperature() {
    return this.temperature;
  }

  public getBoostActive() {
    return this.boostActive;
  }

  public getAwayActive() {
    return this.awayActive;
  }

  public getDeviceId() {
    return this.deviceId;
  }

  public getDevice() {
    return this.device;
  }

  async updateData() {
    try {
      const aquantaData = await this.getAquantaData();
      this.temperature = aquantaData.tempValue;
      this.boostActive = aquantaData.boostRunning;
      this.boostDuration = aquantaData.boost_duration;
      this.awayActive = aquantaData.awayRunning;
      this.deviceId = aquantaData.deviceId;
      this.device = aquantaData.device;
      this.log.info(`Temperature: ${this.temperature}, Boost Mode: ${this.boostActive}, ` +
      `Boost Duration: ${this.boostDuration}, Away Mode: ${this.awayActive}`);
      this.log.debug(`Returned Aquanta Data: \n${JSON.stringify(aquantaData, null, 2)}`);
    } catch(error: unknown) {
      if (error instanceof Error) {
        return {
          message: `Error calling Aquanta API: ${error.message}`,
        };
      }
    }
  }

  async getAquantaData() {
    if ( !this.aquantaToken ) {
      await this.authenticateUser(
        this.config.aquantaKey || AQUANTA_GOOGLE_KEY,
        this.config.email,
        this.config.password);
    }

    let aquantaData = await this.callAquantaDataAPI();
    if ( !aquantaData ) {
      this.log.info('Aquanta Token Expired.  Attempting to reauthenticate.');
      const token = await this.callAquantaDataAPI();
      if ( !token ) {
        this.log.error('Aquanta Token Expired.  Could not reauthenticate');
      } else {
        aquantaData = this.getAquantaData();
      }
    }

    return aquantaData;
  }

  async authenticateUser(aquantaGoogleKey: string, email: string, password: string) {
    const googleLoginRes = await GoogleClient.post(`identitytoolkit/v3/relyingparty/verifyPassword?key=${aquantaGoogleKey}`,
      {'email':email, 'password':password, 'returnSecureToken':true});
    this.log.debug(`Retrieved Google ID Token: ${googleLoginRes.data.idToken}`);

    const aquantaToken = await AquantaClient.post('portal/login',
      {'idToken':googleLoginRes.data.idToken, 'remember':true},
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
        withCredentials: true,
      })
      .then(res => {
        const cookieArray = res.headers['set-cookie'];
        const authCookie = cookieArray ? cookieArray[0] : null;
        if ( authCookie ) {
          const cookieTextSplit = authCookie.split(';', 1);
          const authTokenSplit = cookieTextSplit[0].split('=');
          return authTokenSplit[1];
        } else {
          throw new Error(`Error Authenticating.  Could not parse cookie: ${cookieArray}`);
        }
      });

    this.log.debug(`Retrieved Aquanta Token: ${aquantaToken}`);
    this.aquantaToken = aquantaToken;
    return aquantaToken;
  }

  async callAquantaDataAPI() {
    AquantaClient.defaults.headers['Cookie'] = `aquanta-prod=${this.aquantaToken}`;
    return await AquantaClient.get('portal/get', {timeout: 1500, validateStatus: () => true})
      .then(res => {
        if ( res.status === 200 ) {
          return res.data;
        } else if ( res.status === 401 ) {
          this.aquantaToken = null;
          return null;
        } else {
          throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
        }
      })
      .catch(err => {
        throw new Error(`Error calling Aquanta API: ${err.message}`);
      });
  }

  async turnOffAway () {
    return await AquantaClient.put('portal/set/schedule/away/off', {}, {validateStatus: () => true})
      .then(res => {
        if ( res.status !== 200 ) {
          throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
        }
        this.awayActive = false;
      })
      .catch(err => {
        throw new Error(`Error calling Aquanta API: ${err.message}`);
      });
  }

  async turnOnAway () {
    const start_date = new Date();
    const stop_date = add(start_date, {hours: 336});
    const away_format = 'yyyy-MM-dd\'T\'HH:mm:ssxxxxx';

    const data = {
      start: format(start_date, away_format),
      stop: format(stop_date, away_format),
      mode: 'now',
    };
    this.log.debug(`Away Mode Activate Return: ${JSON.stringify(data)}`);


    return await AquantaClient.put('portal/set/schedule/away', data, {timeout: 5000, validateStatus: () => true})
      .then(res => {
        if ( res.status !== 200 ) {
          throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
        }
        this.awayActive = true;
      })
      .catch(err => {
        throw new Error(`Error calling Aquanta API: ${err.message}`);
      });
  }

  async turnOffBoost () {
    return await AquantaClient.put('portal/set/schedule/boost/off', {}, {validateStatus: () => true})
      .then(res => {
        if ( res.status !== 200 ) {
          throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
        }
        this.boostActive = false;
      })
      .catch(err => {
        throw new Error(`Error calling Aquanta API: ${err.message}`);
      });
  }

  async turnOnBoost () {
    const start_date = new Date();
    let dateDelta;
    if (this.boostDuration < 1 ) {
      dateDelta = {minutes: this.boostDuration * 60};
    } else {
      dateDelta = {hours: this.boostDuration};
    }
    const stop_date = add(start_date, dateDelta);
    const boost_format = 'yyyy-MM-dd\'T\'HH:mm:ssxxxxx';

    const data = {
      start: format(start_date, boost_format),
      stop: format(stop_date, boost_format),
      prompt_for_boost: true,
      mode: 'now',
    };
    this.log.debug(`Boost Mode Activate Return: ${JSON.stringify(data)}`);

    return await AquantaClient.put('portal/set/schedule/boost', data, {timeout: 5000, validateStatus: () => true})
      .then(res => {
        if ( res.status !== 200 ) {
          throw new Error(`Error calling Aquanta API: ${res.status}: ${res.statusText}`);
        }
        this.boostActive = true;
      })
      .catch(err => {
        throw new Error(`Error calling Aquanta API: ${err.message}`);
      });
  }

}

