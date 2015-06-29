#!/bin/bash -x
cd `dirname $0`/../lang
rm lang.tar.gz
wget "https://babel.mega.co.nz/?u=6Uqi4ObVXDvutqyOMTd5&id=fetch&" -O lang.tar.gz
tar xfvz lang.tar.gz
