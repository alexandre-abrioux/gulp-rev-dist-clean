SHELL := /bin/bash
.PHONY: help test
.DEFAULT_GOAL := help

help:		## Displays this help message
	@echo -e "$$(grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | sed -e 's/:.*##\s*/:/' -e 's/^\(.\+\):\(.*\)/\\x1b[36m\1\\x1b[m:\2/' | column -c2 -t -s :)"

install: 	## Installs npm packages
	bin/npm install

test: 		## Runs unit test
	bin/npm run test

fix: 		## Fixes JS files with XO
	bin/npm run xo -- --fix
