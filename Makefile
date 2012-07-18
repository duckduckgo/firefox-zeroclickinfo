
build:
	cfx xpi --force-mobile

install:
	adb push mobile.xpi /mnt/sdcard/mobile.xpi

sdrun:
	adb shell am start -a android.intent.action.VIEW \
                   -c android.intent.category.DEFAULT \
                   -d file:///mnt/sdcard/mobile.xpi \
                   -n org.mozilla.firefox/.App

run:
	cfx run -a fennec-on-device -b /usr/bin/adb --mobile-app firefox --force-mobile
