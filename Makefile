# Site-dependent variables
NODE_PATH = ./node_modules
NPM = npm
NODE = node

# Build-depends - make sure you keep BUILD_DEP_ALL and BUILD_DEP_ALL_NAMES up-to-date
KARMA  = $(NODE_PATH)/karma/bin/karma
JSDOC  = $(NODE_PATH)/.bin/jsdoc
JSHINT = $(NODE_PATH)/.bin/jshint
JSCS = $(NODE_PATH)/.bin/jscs
BUILD_DEP_ALL = $(KARMA) $(JSDOC)
BUILD_DEP_ALL_NAMES = karma jsdoc

ASMCRYPTO_MODULES = utils,aes-cbc,aes-ccm,sha1,sha256,sha512,hmac-sha1,hmac-sha256,hmac-sha512,pbkdf2-hmac-sha1,pbkdf2-hmac-sha256,pbkdf2-hmac-sha512,rng,bn,rsa-pkcs1,globals-rng,globals

# If the env variable SILENT is set, silence output of make via `-s` flag.
ifdef SILENT
    SILENT_MAKE = "-s"
endif

# If no browser set, run on our custom PhantomJS2.
ifeq ($(BROWSER),)
    BROWSER = PhantomJS2_custom
endif

# All browsers to test with on the test-all target.
TESTALL_BROWSERS = PhantomJS2_custom,Chrome,Firefox
ifeq ($(OS), Windows_NT)
    TESTALL_BROWSERS := $(TESTALL_BROWSERS),IE,FirefoxNightly,FirefoxDeveloper,Firefox_NoCookies
endif

all: test-ci api-doc dist test-shared

test-no-workflows:
	SKIP_WORKFLOWS=true $(MAKE) $(SILENT_MAKE) test

test: $(KARMA)
	@rm -rf test/phantomjs-storage
	$(NODE) $(KARMA) start --preprocessors= karma.conf.js --browsers $(BROWSER) $(OPTIONS)

test-ci: $(KARMA)
	@rm -rf test/phantomjs-storage
	$(NODE) $(KARMA) start --singleRun=true --no-colors karma.conf.js --browsers $(BROWSER) $(OPTIONS)

test-all:
	OPTIONS="--singleRun=true" BROWSER=$(TESTALL_BROWSERS) $(MAKE) $(SILENT_MAKE) test

api-doc: $(JSDOC)
	$(NODE) $(JSDOC) --destination doc/api/ --private \
                 --configure jsdoc.json \
                 --recurse

jshint: $(JSHINT)
	@-$(NODE) $(JSHINT) --verbose .

jscs: $(JSCS)
	@-$(NODE) $(JSCS) --verbose .

pkg-upgrade:
	@npm outdated --depth=0
	@npm outdated --depth=0 | grep -v Package | awk '{print $$1}' | xargs -I% npm install %@latest $(OPTIONS)

checks: jshint jscs

clean:
	rm -rf doc/api/ coverage/ build/ test-results.xml test/phantomjs-storage

clean-all: clean
	rm -f $(BUILD_DEP_ALL)
	rm -rf $(BUILD_DEP_ALL_NAMES:%=$(NODE_PATH)/%) $(DEP_ALL_NAMES:%=$(NODE_PATH)/%)

.PHONY: all test test-no-workflows test-all test-ci api-doc jshint jscs checks
.PHONY: clean clean-all pkg-upgrade
