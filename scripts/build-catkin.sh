#!/bin/bash

rm -rf debian/ node_modules/ dist/
bloom-generate rosdebian
sed -r -e 's/(\t\dh_shlibdeps.*)/\1 -Xnode/' debian/rules
echo "override_dh_strip:" >>debian/rules
echo -e "\tdh_strip -Xnode" >>debian/rules
fakeroot debian/rules binary
