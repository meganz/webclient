# Weblate scripts

Interact with the Weblate API with these script to upload and download strings for a project.

Project support is flexible and extensible via configuration files and python modules.

--------------------

## Requirements:

The python scripts are designed for python3+ and require the requests library.

The node.js scripts are designed for node.js v20+ and require no additional libraries.

--------------------

## Configuration:

The scripts use two types of files to configure how and what they interact with. All scripts require a `translate.json` file. Android and iOS require additional project named `*.conf` files. Both are detailed below.

### `translate.json` 

The `translate.json.example` configuration file provides a template for configuring the scripts. Create a copy of this file and name it `translate.json` before modifying it. 

> Not all fields are required for all projects. Many of these have default values that can be checked in the relevant scripts.

`BASE_URL` The URL to access the Weblate API.

`SOURCE_TOKEN` The Weblate API token for your user. To retrieve your token visit Weblate -> Your profile -> API access. This can optionally be configured as an environment variable `WEBLATE_TOKEN`.

`PROJECT` The Weblate project slug/id the script shall work in e.g: ios, pwm-extension.

`COMPONENT` The base component identifier for the node.js script e.g: Webclient would use `prod`.

`LIB_PROJECT` The optional Weblate project slug/id the script shall use to configure fetching from a library component. Will overwrite `PROJECT`. Check the `-l/--library` argument for related information.

> The following four options are applicable to iOS projects only

`GITLAB_TOKEN` The Gitlab API token for your user. This can optionally be configured as an environment variable `GITLAB_TOKEN`.

`GITLAB_PROJ_ID` The Gitlab project ID to check for source string files.

`GITLAB_BRANCH` The Gitlab branch name to check for source string files.

`PROD_PATH` The relative path in the git repository where the source string files are.

> The scripts are already configured to work with appropriate defaults for these following values so only add them if necessary to overwrite the default.

`TEMPLATE_NAME` The name of the template file to use when creating branch components.

`FILE_ENCODING` A mapping of base component names to file encodings. Applicable mainly to iOS and is not supported in the node.js script e.g:

```
{
    "localizable": "utf-16",
    ...
}
```

`FILE_FORMAT` The string the defines which file format to use when creating branch components.

`MIME` The file MIME type string related to the `FILE_FORMAT` e.g: `application/xml`.

--------------------

### `*.conf`

Additional component configuration is required for some projects and can be configured with a simple file such as `android.conf`. The name of this file should match the project slug/id in Weblate where the string files will be retrieved from.

Each project file contains a relation between the base component i.e: `strings_shared` and a directory relative to the folder the script is located in to store the file.

Android will additionally append `/app/src/main/res/values(-language)`

iOS will additionally append the `PROD_PATH` related to the above configuration and the appropriate `language.lproj`

This additional path can also be changed by using the `-s/--startpath` option which takes precedence

--------------------

## Uses:

Android and iOS may use either `lang.sh` or directly use the python script `python/lang.py` with appropriate arguments.

Webclient/PWM extension may use either `lang.sh` or directly use the node script `node/lang.js` with appropriate arguments.

--------------------

### Downloading strings

To simply download the strings files for the configured project and component run the following for your platform.

Note: This does also include any branch components if there is one available for the current git branch.

Android:

`./lang.sh -a android`

iOS:

`./lang.sh -a ios`

Webclient:

`./lang.sh`

PWM Extension:

`./lang.sh -sh pwm`

To download all the strings for all the configured components in the project add the `-p/--production` script argument. See below for more details on production mode.

--------------------

### Uploading strings

To simply upload the strings files for the configured project and component do the following for your platform.

Android:

1) Create a `strings.xml` file with the strings to be uploaded
2) Run `./lang.sh -a android -u`
    
> By default the script will check for a `strings.xml` file in the script directory. This can be changed via the file path argument

3) The strings will be uploaded to the configured project and component
4) The download process above will run automatically

iOS:

1) Edit the relevant `.strings` or `.stringsdict` file
2) Run `./lang.sh -a ios -u`
3) The strings that are new in the given file will be uploaded to the configured project and component
4) The download process above will run automatically

Webclient:

1) Create a `strings.json` file with the strings to be uploaded
2) Run `./lang.sh -u`
    
> By default the script will check for a `strings.json` file in the Webclient `lang` directory. This can be changed via the file path argument

3) The strings will be uploaded to the configured project and component
4) The download process above will run automatically

PWM Extension (to own project):

1) Create a `strings.json` file with the strings to be uploaded
2) Run `./lang.sh -u pwm -sh pwm`

> By default the script will check for a `strings.json` file in the PWM `lang` directory. This can be changed via the file path argument

3) The strings will be uploaded to the PWM extension project and component
4) The download process above will run automatically

PWM Extension (to webclient project):

1) Create a `strings.json` file with the strings to be uploaded
2) Run `./lang.sh -u -sh pwm`

> By default the script will check for a `strings.json` file in the PWM `lang` directory. This can be changed via the file path argument

3) The strings will be uploaded to the Webclient project and component
4) The download process above will run automatically

Directly to main component (node script):

> This mode should NOT be used if the project supports branching.

1) Create a `strings.json` file with the strings to be added or replaced in the main component
2) Run `./lang.sh -u -pm`

> By default the script will check for a `strings.json` file in the `lang` directory. This can be changed via the file path argument

3) The strings will be uploaded to the main component in the project
4) The download process above will run automatically excluding any branches

--------------------

## Script arguments

The scripts take several arguments to configure what and how to process the interactions with Weblate.

This table is a reference for what they do. The Additional data column indicates what if any type to provide. Those types in `()` are required if using the argument while those in `[]` are not. 

| Argument (full) | Argument (short) | Additional data | Effective in | Effect |
| ------ | ------ | ------ | ------ | ------ |
| `--application` | `-a` | (String) Application choice | Android, iOS | Must be specified so the script can correctly parse and apply application specific code. Accepted values are `android` or `ios` | 
| `--update` | `-u` | [String] Shared project tag | All | Apply a strings update to a branch component in Weblate. Creates the branch component if none exists. Shared tag can be specified as the optional argument for PWM |
| `--filepath` | `-f` | (String) File path | Android, Webclient, PWM | File path to read strings data from when uploading. |
| `--component` | `-c` | (String) Component slug/id in Weblate | Android, iOS | Change to upload/download from the default component to a specified component |
| `--production` | `-p` | - | All | Incompatible with `-u/--update`. Android and iOS will change the script to download all the components in the project configuration (.conf) file. Webclient will instead save the files with a different suffix. PWM will additionally fetch strings labelled with the `pwm` shared label in webclient components |
| `--startpath` | `-s` | (String) Folder path | Android, iOS | Relative folder path to store downloaded files in. Must start with a `/` but not end with one. Android will automatically append `-lang` as appropriate. iOS will automatically append `/lang.lproj` as appropriate. |
| `--library` | `-l` | (String) Library component | Android, iOS | Weblate project id/slug where the library component can be found. May be used in conjunction with the config `LIB_PROJECT` to overwrite the `PROJECT` value. Will force the script to load the configuration (.conf) file that matches the string. |
| `--charlimit` | `-cl` | - | Android, iOS | Requires `-u/--update`. Will activate the character limit setting function after strings are uploaded. The user will be prompted to specify string character limits |
| `--branch` | `-br` | (String) Branch component id/slug | Webclient, PWM | Additional branch component to try and include in the downloaded files |
| `--pushmain` | `-pm` | - | Webclient, PWM | Requires `-u/--update`. Will upload directly to the main configured project component instead of a branch |
| `--verbose` | `-v` | - | All | Enables more verbose logging | 
