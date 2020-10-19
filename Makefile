# User/runtime variables
# For browser-test and headless-browser-test.
# BROWSER = Firefox

# Site-dependent variables
NODE_PATH = ./node_modules
NPM = npm
NODE = node

# Build-depends - make sure you keep BUILD_DEP_ALL and BUILD_DEP_ALL_NAMES up-to-date
KARMA  = $(NODE_PATH)/karma/bin/karma
JSDOC  = $(NODE_PATH)/.bin/jsdoc
RSG = $(NODE_PATH)/.bin/rsg
BUILD_DEP_ALL = $(KARMA) $(JSDOC)
BUILD_DEP_ALL_NAMES = karma jsdoc

ASMCRYPTO_MODULES = utils,aes-cbc,aes-ccm,sha1,sha256,sha512,hmac-sha1,hmac-sha256,hmac-sha512,pbkdf2-hmac-sha1,pbkdf2-hmac-sha256,pbkdf2-hmac-sha512,rng,bn,rsa-pkcs1,globals-rng,globals

# If the env variable SILENT is set, silence output of make via `-s` flag.
ifdef SILENT
    SILENT_MAKE = "-s"
endif

# If HEADLESS is set, we'll run our browser in headless mode through xvfb-run.
ifneq ($(HEADLESS),)
    HEADLESS_RUN = "xvfb-run"
endif

# If no browser set, run ChromeHeadless by default.
ifeq ($(BROWSER),)
    BROWSER = ChromeHeadless
endif

# If no Karma flags set, set a default.
ifeq ($(KARMA_FLAGS),)
    # Set to --preprocessors= to show line numbers, otherwise coverage clobbers them.
    KARMA_FLAGS = --preprocessors=
endif

ifdef SINGLE_RUN
    SINGLE_RUN_FLAG = "--singleRun=true"
endif

# All browsers to test with on the test-all target.
TESTALL_BROWSERS = ChromeHeadless,FirefoxHeadless,Chrome_NoCookies,Chrome_Incognito
ifeq ($(OS), Windows_NT)
    TESTALL_BROWSERS := $(TESTALL_BROWSERS),FirefoxNightlyHeadless,FirefoxDeveloperHeadless
endif

all: test-ci api-doc ui-styleguide dist test-shared

test-no-workflows:
	SKIP_WORKFLOWS=true $(MAKE) $(SILENT_MAKE) test

test: $(KARMA)
	$(HEADLESS_RUN) $(NODE) $(KARMA) start $(KARMA_FLAGS) karma.conf.js --browsers $(BROWSER) $(OPTIONS)

test-ci: $(KARMA)
	KARMA_FLAGS="--singleRun=true --no-colors" $(MAKE) $(SILENT_MAKE) test

test-debug: $(KARMA)
	KARMA_FLAGS="--preprocessors= --debug ${SINGLE_RUN_FLAG}" $(MAKE) $(SILENT_MAKE) test

test-all:
	KARMA_FLAGS="--preprocessors= --singleRun=true" BROWSER=$(TESTALL_BROWSERS) $(MAKE) $(SILENT_MAKE) test

api-doc: $(JSDOC)
	$(NODE) $(JSDOC) --destination doc/api/ --private \
                 --configure jsdoc.json \
                 --recurse
ui-styleguide: $(RSG)
	$(RSG) "./dont-deploy/ui/src/**/*.jsx" -c styleguide.json

pkg-upgrade:
	@npm outdated --depth=0
	@npm outdated --depth=0 | grep -v Package | awk '{print $$1}' | xargs -I% npm install %@latest $(OPTIONS)

clean:
	rm -rf doc/api/ coverage/ build/ test-results.xml jscpd-report.xml test/phantomjs-storage dont-deploy/ui/out/
	rm -f css/*-group*.css js/*-group*.js js/mega-*.js css/mega-*.css node_modules/banner-*.js html/templates.json secureboot.prod.js

clean-all: clean
	rm -f $(BUILD_DEP_ALL)
	rm -rf $(BUILD_DEP_ALL_NAMES:%=$(NODE_PATH)/%) $(DEP_ALL_NAMES:%=$(NODE_PATH)/%)

.PHONY: all test test-no-workflows test-all test-ci api-doc
.PHONY: clean clean-all pkg-upgrade
