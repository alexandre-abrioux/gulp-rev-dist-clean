SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help
help:		## Displays this help message
	@echo -e "$$(grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | sed -e 's/:.*##\s*/:/' -e 's/^\(.\+\):\(.*\)/\\x1b[36m\1\\x1b[m:\2/' | column -c2 -t -s :)"

.PHONY: install
install: 	## Installs npm packages
	bin/npm install

.PHONY: test
test: 		## Runs unit tests
	bin/npm run test

.PHONY: lint
lint: 		## Fixes TS files with prettier and eslint
	bin/npm run lint
