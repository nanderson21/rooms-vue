#!/bin/bash
# quick, basic regression testing
function pause(){
   read -p "$*"
}
cp ./test-data/starsfight.jpg ./tmp.jpg

echo got tmp.jpg - adding 'jon'
node cs-xmptest.js wa tmp.jpg -artworkorobject {aocreator=jon}
echo ------------------------------------------------
node cs-xmptest.js r tmp.jpg
pause 'added jon (hit enter...) '

echo changing jon to alice
node cs-xmptest.js wr tmp.jpg -artworkorobject {aocreator=alice}
echo ------------------------------------------------
node cs-xmptest.js r tmp.jpg
pause 'replaced with alice (hit enter...) '

echo deleting aocreator tag
node cs-xmptest.js wd tmp.jpg -artworkorobject {aocreator=alice}
echo ------------------------------------------------
node cs-xmptest.js r tmp.jpg
pause 'deleted alice (hit enter...) '

echo dump to tmp.xmp
node cs-xmptest.js x tmp.jpg tmp.xmp
echo ------------------------------------------------
cat tmp.xmp
echo
echo that was tmp.xmp
echo 
echo "delete test files (tmp .jpg, .jpg_original, and .xmp [.xmp_original]? "
select yn in "Yes" "No"; do
    case $yn in
        Yes ) rm tmp.jpg; rm tmp.jpg_original; rm tmp.xmp; rm tmp.xmp_original > /dev/null 2>&1; break;;
        No ) exit;;
    esac
done