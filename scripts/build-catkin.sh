#!/bin/bash

bloom-generate rosdebian
sed -r -e 's/(\t\dh_shlibdeps.*)/\1 -Xnode/' debian/rules
echo "override_dh_strip:" >>debian/rules
echo "  dh_strip -Xnode" >>debian/rules
fakeroot debian/rules binary