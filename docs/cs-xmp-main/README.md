# creative.space exiftool wrapper 

This was the beginning of tests to see if we wanted to use exiftool to
manipulate XMP data in media files (for content managment).

This effort has been superceeded by //STREAMLINE

# Nick's References on XMP

https://www.adobe.com/devnet/xmp.html

https://manualzz.com/doc/10434614/partners-guide-to-xmp-for-dynamic-media?__cf_chl_tk=JSWev_bGsv0SQnv5dG.kjqmFO1vCr7o9hZ1BQD8MUP8-1648056378-0-gaNycGzNB-U

https://manualzz.com/doc/11372502/introduction-to-asset-relationships

See mcm-exiftool for a package that just gets file information (like cs-mediainfo and mcm-redline)

Tip: if you have your ssh key registered with gitHub, you can install or clone this packag with one of these commands:

```
npm install git+ssh://git@github.com:digitalglue-software/cs-xmp.git
git clone git@github.com:digitalglue-software/cs-xmp.git
```
Requires the Image-ExifTool-12.40.tar.gz from [exiftool.org](https://exiftool.org/)

This package updated to use Version 12.4 (4.8 MB) - Feb. 9, 2022

Installed per [the instructions](https://exiftool.org/install.html#Unix)

('sudo apt install libimage-exiftool-perl' would install v10.60who)

###TL;DR
```
curl -O https://exiftool.org/Image-ExifTool-12.40.tar.gz
gzip -dc Image-ExifTool-12.40.tar.gz | tar -xf -
cd Image-ExifTool-12.40
perl Makefile.PL
make test
sudo make install
```
TBD other packages may be needed


See notes.md and csXMP.md for initial test results