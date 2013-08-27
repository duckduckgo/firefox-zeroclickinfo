NAME := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('name','')" < package.json)
VERSION := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('version','')" < package.json)
TMP := /tmp/$(NAME)

xpi:
	cd /opt/addon-sdk && source bin/activate; cd -
	cfx xpi
	mv $(NAME).xpi build/
	git commit -am "built $(VERSION)"

tmpxpi:
	cfx xpi
	mkdir -p $(TMP)
	mv $(NAME).xpi $(TMP)/
