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
JSHINT = $(NODE_PATH)/.bin/jshint
RSG = $(NODE_PATH)/.bin/rsg
JSCS = $(NODE_PATH)/.bin/jscs
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

# If no browser set, run on our custom PhantomJS2.
ifeq ($(BROWSER),)
    BROWSER = PhantomJS2_custom
endif

# If no Karma flags set, set a default.
ifeq ($(KARMA_FLAGS),)
    # Set to --preprocessors= to show line numbers, otherwise coverage clobbers them.
    KARMA_FLAGS = "--preprocessors="
endif

# All browsers to test with on the test-all target.
TESTALL_BROWSERS = PhantomJS2_custom,Chrome_Unlimited,Firefox
ifeq ($(OS), Windows_NT)
    TESTALL_BROWSERS := $(TESTALL_BROWSERS),IE,FirefoxNightly,FirefoxDeveloper,Firefox_NoCookies,Chrome_NoCookies,Chrome_Incognito
endif

all: test-ci api-doc ui-styleguide dist test-shared

test-no-workflows:
	SKIP_WORKFLOWS=true $(MAKE) $(SILENT_MAKE) test

test: $(KARMA)
	@rm -rf test/phantomjs-storage
	$(HEADLESS_RUN) $(NODE) $(KARMA) start $(KARMA_FLAGS) karma.conf.js --browsers $(BROWSER) $(OPTIONS)

test-ci: $(KARMA)
	KARMA_FLAGS="--singleRun=true --no-colors" $(MAKE) test

test-debug: $(KARMA)
	KARMA_FLAGS=" --debug " $(MAKE) test

test-all:
	OPTIONS="--singleRun=true" BROWSER=$(TESTALL_BROWSERS) $(MAKE) $(SILENT_MAKE) test

api-doc: $(JSDOC)
	$(NODE) $(JSDOC) --destination doc/api/ --private \
                 --configure jsdoc.json \
                 --recurse
ui-styleguide: $(RSG)
	$(RSG) "./dont-deploy/ui/src/**/*.jsx" -c styleguide.json

jshint: $(JSHINT)
	@-$(NODE) $(JSHINT) --verbose .

jscs: $(JSCS)
	@-$(NODE) $(JSCS) --verbose .

pkg-upgrade:
	@npm outdated --depth=0
	@npm outdated --depth=0 | grep -v Package | awk '{print $$1}' | xargs -I% npm install %@latest $(OPTIONS)

checks: jshint jscs

clean:
	rm -rf doc/api/ coverage/ build/ test-results.xml test/phantomjs-storage dont-deploy/ui/out/

clean-all: clean
	rm -f $(BUILD_DEP_ALL)
	rm -rf $(BUILD_DEP_ALL_NAMES:%=$(NODE_PATH)/%) $(DEP_ALL_NAMES:%=$(NODE_PATH)/%)

.PHONY: all test test-no-workflows test-all test-ci api-doc jshint jscs checks
.PHONY: clean clean-all pkg-upgrade
