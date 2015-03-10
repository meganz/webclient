# Site-dependent variables
NODE_PATH = ./node_modules
NPM = npm
NODE = node

# Build-depends - make sure you keep BUILD_DEP_ALL and BUILD_DEP_ALL_NAMES up-to-date
KARMA  = $(NODE_PATH)/karma/bin/karma
JSDOC  = $(NODE_PATH)/.bin/jsdoc
BUILD_DEP_ALL = $(KARMA) $(JSDOC)
BUILD_DEP_ALL_NAMES = karma jsdoc

ASMCRYPTO_MODULES = utils,aes-cbc,aes-ccm,sha1,sha256,sha512,hmac-sha1,hmac-sha256,hmac-sha512,pbkdf2-hmac-sha1,pbkdf2-hmac-sha256,pbkdf2-hmac-sha512,rng,bn,rsa-pkcs1,globals-rng,globals

all: test api-doc dist test-shared

test: $(KARMA)
	$(NODE) $(KARMA) start --singleRun=true karma.conf.js --browsers PhantomJS

api-doc: $(JSDOC)
	$(NODE) $(JSDOC) --destination doc/api/ --private \
                 --configure jsdoc.json \
                 --recurse

clean:
	rm -rf doc/api/ coverage/ build/ test-results.xml

clean-all: clean
	rm -f $(BUILD_DEP_ALL)
	rm -rf $(BUILD_DEP_ALL_NAMES:%=$(NODE_PATH)/%) $(DEP_ALL_NAMES:%=$(NODE_PATH)/%)

.PHONY: all test api-doc clean clean-all
