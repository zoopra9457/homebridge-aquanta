# homebridge-aquanta Plugin

`homebridge-aqunta` is a [Homebridge](https://github.com/nfarina/homebridge) plugin with integrates with the [Aquanta](https://aquanta.io/)
Water Heater controller. 

`homebridge-aqunta` supports the current Water Heater Temperature, Boost Mode Switch, and Away Mode Switch.

## Installation

You need to have [Homebridge](https://github.com/nfarina/homebridge) installed. Refer to the repo for
instructions.  

Then run the following command to install `homebridge-aqunta`

```
sudo npm install -g homebridge-aqunta
```

## Configuration:

Configuration sample (edit `~/.homebridge/config.json`):

```json
    "platforms": [
        {
            "email": "user@domain.com",
            "password": "password",
            "platform": "Aquanta"
        }
    ]
```

- `email` \<string\> **required**: The email address for your Aquanta Portal account.
- `password` \<string\> **required**: The password for your Aquanta Portal account.
- `platform` \<string\> **required**: Must be "Aquanta"

## Known Limitations

Only works with a single Aquanta unit associated to your account.  If you have multiple Aquanta units and would 
like to use this plugin, please open an Issue to request functionality.  I may need some information from you 
to fully implement.




Note: The developer of the `homebridge-aqunta` is not associated with the Aquanta company.
