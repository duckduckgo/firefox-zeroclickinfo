NAME := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('name','')" < package.json)
VERSION := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('version','')" < package.json)
TMP := /tmp/$(NAME)

xpi:
	jpm xpi
	-rm build/
	mkdir -p build/ && mv $(NAME).xpi build/
	git commit -am "built $(VERSION)"

tmpxpi:
	jpm xpi
	mkdir -p $(TMP)
	mv $(NAME).xpi $(TMP)/

partnerxpi:
	sed -i "s#PARTNER_QUERY_ADDITION = '';#PARTNER_QUERY_ADDITION = '\&t=$(PARTNER_ID)'#g" lib/main.js
	sed -i '0,/<Param name="q" value="{searchTerms}"\/>/s//<Param name="q" value="{searchTerms}"\/><Param name="t" value="$(PARTNER_ID)"\/>/' data/search.xml
	jpm xpi
	mv $(NAME).xpi $(NAME)-$(PARTNER_ID).xpi
	echo "Built extension into $(NAME)-$(PARTNER_ID).xpi"
