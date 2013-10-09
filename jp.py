#!/usr/bin/python

"""
Utility script to get values from package.json file
Input is a json path using [], e.g. ["name"] or ["dependencies"]["ejs"]
"""

import json
import sys

USAGE_STR = """
Usage: 
%s 'jsonpath'

where jsonpath looks something like ["name"] or ["dependencies"]["ejs"]

"""

def usage(errStr):
	print errStr
	print USAGE_STR % sys.argv[0]
	sys.exit(1)
	
if len(sys.argv) < 2:
	usage("Not enough args")
	
jsonPath = "data" + sys.argv[1]

jsonData=open('package.json')

data = json.load(jsonData)

try:
	print eval(jsonPath)
except NameError:
	print "json path is not valid"
	sys.exit(1)
