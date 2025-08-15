# Dev Notes
These are mostly early tests and results...

here is the help for cs-xmptest (or npm test)
```
try one of these:

  node cs-xmptest.js r <filename> [[-namespace:]field]
    read xmp from file
    default field is 'all' (global xmp space)
    limit to a specific namespace, must start with dash '-drone-dji:all'

  node cs-xmptest.js wa|wd|wr <filename> <field> <value>
    write xmp file
    wa = add, wd = delete, wr = replace

  node cs-xmptest.js x <sourcefile> <destfile>
    export xmp metadata to a separate file

```

# cs-xmp.get (read) tests:

## read file with no metadata
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ npm test r noxmp.jpg 

> cs-xmp@1.0.0 test /home/csadmin/cs-source/cs-xmp
> node cs-xmptest "noxmp.jpg"

{
  status: 'Ok',
  message: '',
  function: 'csxmp.get',
  args: [ '' ],
  data: [ { SourceFile: 'noxmp.jpg' } ],
  exitcode: 0
}
```

## read file with some xmp (added with Photoshop Elements)
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ npm test r starsfight.jpg 

> cs-xmp@1.0.0 test /home/csadmin/cs-source/cs-xmp
> node cs-xmptest "starsfight.jpg"

{
  status: 'Ok',
  message: '',
  function: 'csxmp.get',
  args: [ '' ],
  data: [
    {
      SourceFile: 'starsfight.jpg',
      XMPToolkit: 'Adobe XMP Core 5.6-c067 79.157747, 2015/03/30-23:40:42        ',
      CreatorTool: 'Adobe Photoshop CC 2017 (Macintosh)',
      CreateDate: '2020:02:05 10:16:02-08:00',
      MetadataDate: '2020:02:05 10:19:51-08:00',
      Rating: 3,
      DocumentID: 'A1EACEBA64856B3F767743D5122D953F',
      InstanceID: 'xmp.iid:1384cf9b-1956-be4a-bacd-83f8fd37d6b5',
      OriginalDocumentID: 'A1EACEBA64856B3F767743D5122D953F',
      Format: 'image/jpeg',
      ColorMode: 'RGB',
      ICCProfileName: 'sRGB IEC61966-2.1',
      WebStatement: 'https://www.cnn.com/2020/02/05/world/star-fight-alma-scn/index.html',
      History: [Array],
      Title: '200205113304-alma-stellar-fight-exlarge-169.jpg',
      Description: "Stars that have companions aren't always friendly to them, as evidenced by a stellar confrontation witnessed by astronomers.\n" +
        '\n' +
        'They studied the binary star system, HD101584, using the Atacama Large Millimeter/submillimeter Array of telescopes in Chile to find out what happened.'
    }
  ],
  exitcode: 0
}
```

## read just one field
You always get at SourceFile
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ npm test r starsfight.jpg documentid 

> cs-xmp@1.0.0 test /home/csadmin/cs-source/cs-xmp
> node cs-xmptest "starsfight.jpg" "documentid"

{
  status: 'Ok',
  message: '',
  function: 'cs-xmp.get',
  args: [ 'documentid' ],
  data: [
    {
      SourceFile: 'starsfight.jpg',
      DocumentID: 'A1EACEBA64856B3F767743D5122D953F'
    }
  ],
  exitcode: 0
}
```
# cs-xmp.write tests (add, delete, replace)

Start with a file with no xmp data - read results:
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r writetest.jpg
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "test-data/writetest.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "test-data/writetest.jpg"
    }
  ],
  "exitcode": 0
}
```
write (add) creator bob
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js wa writetest.jpg -artworkorobject {aocreator=bob}
exiftool -artworkorobject+="{aocreator=bob}" test-data/writetest.jpg
{
  "status": "Ok",
  "message": "test-data/writetest.jpg updated",
  "function": "cs-xmp.add",
  "args": [
    "test-data/writetest.jpg",
    "-artworkorobject",
    "{aocreator=bob}"
  ],
  "data": {
    "output": [
      "    1 image files updated"
    ]
  },
  "exitcode": 0
}

read the updated file

csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r writetest.jpg
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "test-data/writetest.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "test-data/writetest.jpg",
      "XMPToolkit": "Image::ExifTool 11.86",
      "ArtworkOrObject": [
        {
          "AOCreator": [
            "bob"
          ]
        }
      ]
    }
  ],
  "exitcode": 0
}
```

Add another creator, jon
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js wa writetest.jpg -artworkorobject {aocreator=jon}
exiftool -artworkorobject+="{aocreator=jon}" test-data/writetest.jpg
{
  "status": "Ok",
  "message": "test-data/writetest.jpg updated",
  "function": "cs-xmp.add",
  "args": [
    "test-data/writetest.jpg",
    "-artworkorobject",
    "{aocreator=jon}"
  ],
  "data": {
    "output": [
      "    1 image files updated"
    ]
  },
  "exitcode": 0
}

verify two AOCreator fields...

csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r writetest.jpg
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "test-data/writetest.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "test-data/writetest.jpg",
      "XMPToolkit": "Image::ExifTool 11.86",
      "ArtworkOrObject": [
        {
          "AOCreator": [
            "bob"
          ]
        },
        {
          "AOCreator": [
            "jon"
          ]
        }
      ]
    }
  ],
  "exitcode": 0
}
```
Delete bob
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js wd writetest.jpg -artworkorobject {aocreator=bob}
exiftool -artworkorobject-="{aocreator=bob}" test-data/writetest.jpg
{
  "status": "Ok",
  "message": "test-data/writetest.jpg updated",
  "function": "cs-xmp.del",
  "args": [
    "test-data/writetest.jpg",
    "-artworkorobject",
    "{aocreator=bob}"
  ],
  "data": {
    "output": [
      "    1 image files updated"
    ]
  },
  "exitcode": 0
}

verify only jon is left

csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r writetest.jpg
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "test-data/writetest.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "test-data/writetest.jpg",
      "XMPToolkit": "Image::ExifTool 11.86",
      "ArtworkOrObject": [
        {
          "AOCreator": [
            "jon"
          ]
        }
      ]
    }
  ],
  "exitcode": 0
}
```
replace jon with bob:
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js wr writetest.jpg -artworkorobject {aocreator=bob}
exiftool -artworkorobject="{aocreator=bob}" test-data/writetest.jpg
{
  "status": "Ok",
  "message": "test-data/writetest.jpg updated",
  "function": "cs-xmp.replace",
  "args": [
    "test-data/writetest.jpg",
    "-artworkorobject",
    "{aocreator=bob}"
  ],
  "data": {
    "output": [
      "    1 image files updated"
    ]
  },
  "exitcode": 0
}

verify

csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r writetest.jpg
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "test-data/writetest.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "test-data/writetest.jpg",
      "XMPToolkit": "Image::ExifTool 11.86",
      "ArtworkOrObject": [
        {
          "AOCreator": [
            "bob"
          ]
        }
      ]
    }
  ],
  "exitcode": 0
}
```

# cs-xmp.toFile (export) tests:

## export to a separate file
Note: will save 'created' or 'updated' if the dest file exists.

original saved with `_original` appended to the name
also this can happen: 'Error: Not a valid XMP (looks more like a TXT) - out.xmp'

If the output file doesn't exist, it will be created only if a .xmp extension is used.
You can use another extension if the contents are xmp, or if it is an empty file (e.g. 'touch test.tmp')

warning: if you export to an existing, unrelated xmp file, it will ADD new metadata (e.g. blend info)

```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ npm test x starsfight.jpg out.xmp

> cs-xmp@1.0.0 test /home/csadmin/cs-source/cs-xmp
> node cs-xmptest "x" "starsfight.jpg" "out.xmp"

{
  status: 'Ok',
  message: 'out.xmp updated',
  function: 'cs-xmp.toFile',
  args: [ 'starsfight.jpg', 'out.xmp' ],
  data: { output: [ '    1 image files updated' ] },
  exitcode: 0
}
```
### contents of out.xmp, from above
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ cat out.xmp
<?xpacket begin='﻿' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/' x:xmptk='Image::ExifTool 11.86'>
<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>

 <rdf:Description rdf:about=''
  xmlns:dc='http://purl.org/dc/elements/1.1/'>
  <dc:description>
   <rdf:Alt>
    <rdf:li xml:lang='x-default'>Stars that have companions aren&#39;t always friendly to them, as evidenced by a stellar confrontation witnessed by astronomers.

They studied the binary star system, HD101584, using the Atacama Large Millimeter/submillimeter Array of telescopes in Chile to find out what happened.</rdf:li>
   </rdf:Alt>
  </dc:description>
  <dc:format>image/jpeg</dc:format>
  <dc:title>
   <rdf:Alt>
    <rdf:li xml:lang='x-default'>200205113304-alma-stellar-fight-exlarge-169.jpg</rdf:li>
   </rdf:Alt>
  </dc:title>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:photoshop='http://ns.adobe.com/photoshop/1.0/'>
  <photoshop:ColorMode>3</photoshop:ColorMode>
  <photoshop:ICCProfile>sRGB IEC61966-2.1</photoshop:ICCProfile>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:xmp='http://ns.adobe.com/xap/1.0/'>
  <xmp:CreateDate>2020-02-05T10:16:02-08:00</xmp:CreateDate>
  <xmp:CreatorTool>Adobe Photoshop CC 2017 (Macintosh)</xmp:CreatorTool>
  <xmp:MetadataDate>2020-02-05T10:19:51-08:00</xmp:MetadataDate>
  <xmp:ModifyDate>2020-02-05T10:19:51-08:00</xmp:ModifyDate>
  <xmp:Rating>3</xmp:Rating>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:stEvt='http://ns.adobe.com/xap/1.0/sType/ResourceEvent#'
  xmlns:xmpMM='http://ns.adobe.com/xap/1.0/mm/'>
  <xmpMM:DocumentID>A1EACEBA64856B3F767743D5122D953F</xmpMM:DocumentID>
  <xmpMM:History>
   <rdf:Seq>
    <rdf:li rdf:parseType='Resource'>
     <stEvt:action>saved</stEvt:action>
     <stEvt:changed>/</stEvt:changed>
     <stEvt:instanceID>xmp.iid:1384cf9b-1956-be4a-bacd-83f8fd37d6b5</stEvt:instanceID>
     <stEvt:softwareAgent>Adobe Photoshop CC 2020 (Windows)</stEvt:softwareAgent>
     <stEvt:when>2020-02-05T10:19:51-08:00</stEvt:when>
    </rdf:li>
   </rdf:Seq>
  </xmpMM:History>
  <xmpMM:InstanceID>xmp.iid:1384cf9b-1956-be4a-bacd-83f8fd37d6b5</xmpMM:InstanceID>
  <xmpMM:OriginalDocumentID>A1EACEBA64856B3F767743D5122D953F</xmpMM:OriginalDocumentID>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:xmpRights='http://ns.adobe.com/xap/1.0/rights/'>
  <xmpRights:WebStatement>https://www.cnn.com/2020/02/05/world/star-fight-alma-scn/index.html</xmpRights:WebStatement>
 </rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>
```

## export fail
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ npm test x noxmp.jpg out.xmp

> cs-xmp@1.0.0 test /home/csadmin/cs-source/cs-xmp
> node cs-xmptest "x" "noxmp.jpg" "out.xmp"

{
  status: 'Error',
  message: 'Warning: No writable tags set from noxmp.jpg\n',
  function: 'cs-xmp.toFile',
  args: [ 'noxmp.jpg', 'out.xmp' ],
  data: { output: [] },
  exitcode: 0
}
```
****
## simple config test
Add a new tag using a minimal config file...

csadmin@cs-dev-18:~/cs-source/cs-xmp$ cat mytest_conf 
```
%Image::ExifTool::UserDefined = (
    'Image::ExifTool::XMP::dc' => {
        mytest => { },
    },
);
# end
```

csadmin@cs-dev-18:~/cs-source/cs-xmp$ exiftool -config mytest_conf -mytest=blah foo.jpg  
    1 image files updated  
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r foo.jpg
```json
{
  "status": "Ok",
  "message": "",
  "function": "cs-xmp.read",
  "args": [
    "foo.jpg",
    "all"
  ],
  "data": [
    {
      "SourceFile": "foo.jpg",
      "XMPToolkit": "Image::ExifTool 11.86",
      "Mytest": "blah"
    }
  ],
  "exitcode": 0
}
```
