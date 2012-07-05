NAME := $(shell python -c "import json,sys;print json.loads(sys.stdin.read()).get('name','')" < package.json)
VERSION := $(shell python -c "import json,sys;print json.loads(sys.stdin.read()).get('version','')" < package.json)

xpi:
	cd /opt/addon-sdk && source bin/activate; cd -
	cfx xpi
	mv $(NAME).xpi build/
	git commit -am "built $(VERSION)"
