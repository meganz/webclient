KARMA=./node_modules/.bin/karma
JSDOC=jsdoc

nodesetup:
	npm install

test:
	@$(KARMA) start --singleRun=true karma.conf.js --browsers PhantomJS

docs:
	$(JSDOC) --directory=../docs/ --allfunctions -D="title:MegaChat" \
		--template=/usr/local/share/jsdoc-toolkit/templates/codeview/ \
		-D="noGlobal:true" -D="index:files" \
		-p -r 5 -v ../chat/*.js

.PHONY: test