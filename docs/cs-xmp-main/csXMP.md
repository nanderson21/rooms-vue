# csXMP.config Notes
csXMP.config defines some new creative.space XMP namespaces

## Media Fabric

write csMF.Media_Fabric test (create all fields, but didn't fill them all in)
```
node cs-xmptest.js wa foo.jpg Media_Fabric '{\
Content_ID=751d6cc6-18af-474a-a47b-6625ecf04906,\
Media_ID=c2faf744-ecb2-490b-bf2d-f39ee01631f1,\
Checksum=1bbd3be99be5cf2af100290eb0b5027442ba86334fec16da8e75100e78df11b8,\
Global_File_ID=,\
Local_File_ID=,\
File_ID=,\
S3_ID=,\
Premier_ID=6df26f4f-51a7-45cb-b185-b849b60fe47f,\
AvidMC_ID=,\
FCPX_ID=,\
Resolve_ID=,\
Version_ID=,\
State_ID=,\
Instance=,\
FrameIO_ID=\
}'

{
  "status": "Ok",
  "message": "foo.jpg updated",
  "function": "cs-xmp.add",
  "args": [
    "foo.jpg",
    "Media_Fabric",
    "{\\\nContent_ID=751d6cc6-18af-474a-a47b-6625ecf04906,\\\nMedia_ID=c2faf744-ecb2-490b-bf2d-f39ee01631f1,\\\nChecksum=1bbd3be99be5cf2af100290eb0b5027442ba86334fec16da8e75100e78df11b8,\\\nGlobal_File_ID=,\\\nLocal_File_ID=,\\\nFile_ID=,\\\nS3_ID=,\\\nPremier_ID=6df26f4f-51a7-45cb-b185-b849b60fe47f,\\\nAvidMC_ID=,\\\nFCPX_ID=,\\\nResolve_ID=,\\\nVersion_ID=,\\\nState_ID=,\\\nInstance=,\\\nFrameIO_ID=\\\n}"
  ],
  "data": {
    "output": [
      "    1 image files updated"
    ]
  },
  "exitcode": 0
}

```

read from the updated file  
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js r foo.jpg  
Note - fields get alphabetized (see csXMP.config for declared order)
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
      "Media_Fabric": [
        {
          "AvidMC_ID": "",
          "Checksum": "1bbd3be99be5cf2af100290eb0b5027442ba86334fec16da8e75100e78df11b8",
          "Content_ID": "751d6cc6-18af-474a-a47b-6625ecf04906",
          "FcpxId": "",
          "File_ID": "",
          "FrameIO_ID": "",
          "Global_File_ID": "",
          "Instance": "",
          "Local_File_ID": "",
          "Media_ID": "c2faf744-ecb2-490b-bf2d-f39ee01631f1",
          "Premier_ID": "6df26f4f-51a7-45cb-b185-b849b60fe47f",
          "Resolve_ID": "",
          "S3Id": "",
          "State_ID": "",
          "Version_ID": ""
        }
      ]
    }
  ],
  "exitcode": 0
}
```

extract the XMP to a file  
csadmin@cs-dev-18:~/cs-source/cs-xmp$ node cs-xmptest.js x foo.jpg foo.xmp
```
{
  status: 'Ok',
  message: 'foo.xmp created',
  function: 'cs-xmp.toFile',
  args: [ 'foo.jpg', 'foo.xmp' ],
  data: { output: [ '    1 image files created' ] },
  exitcode: 0
}
```
csadmin@cs-dev-18:~/cs-source/cs-xmp$ cat foo.xmp
```xml
<?xpacket begin='﻿' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/' x:xmptk='Image::ExifTool 11.86'>
<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>

 <rdf:Description rdf:about=''
  xmlns:csMF='http://creative.space/csMF/1.0/'>
  <csMF:Media_Fabric>
   <rdf:Seq>
    <rdf:li rdf:parseType='Resource'>
     <csMF:AvidMC_ID/>
     <csMF:Checksum>1bbd3be99be5cf2af100290eb0b5027442ba86334fec16da8e75100e78df11b8</csMF:Checksum>
     <csMF:Content_ID>751d6cc6-18af-474a-a47b-6625ecf04906</csMF:Content_ID>
     <csMF:File_ID/>
     <csMF:FrameIO_ID/>
     <csMF:Global_File_ID/>
     <csMF:Instance/>
     <csMF:Local_File_ID/>
     <csMF:Media_ID>c2faf744-ecb2-490b-bf2d-f39ee01631f1</csMF:Media_ID>
     <csMF:Premier_ID>6df26f4f-51a7-45cb-b185-b849b60fe47f</csMF:Premier_ID>
     <csMF:Resolve_ID/>
     <csMF:State_ID/>
     <csMF:Version_ID/>
    </rdf:li>
   </rdf:Seq>
  </csMF:Media_Fabric>
 </rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>
```
## Media Management
TODO - need full definition
```
node cs-xmptest.js wa foo.jpg Media_Management '{\
Document_ID=751d6cc6-18af-474a-a47b-6625ecf04906,\
Derived_From=c2faf744-ecb2-490b-bf2d-f39ee01631f1,\
Instance_ID=2,\
Original_Document_ID=6df26f4f-51a7-45cb-b185-b849b60fe47f,\
Created_By="Jon Mott"\
}'

{
  status: 'Error',
  message: 'Warning: Missing closing brace for structure',
  function: 'cs-xmp.add',
  args: [
    'foo.jpg',
    'Media_Management',
    '{\\\n' +
      'Document_ID=751d6cc6-18af-474a-a47b-6625ecf04906,\\\n' +
      'Derived_From=c2faf744-ecb2-490b-bf2d-f39ee01631f1,\\\n' +
      'Instance_ID=2,\\\n' +
      'Original_Document_ID=6df26f4f-51a7-45cb-b185-b849b60fe47f,\\\n' +
      'Created_By="Jon Mott"\\\n' +
      '}'
  ],
  data: { output: [] },
  exitcode: 0
}
```
Note the Warning, need to figure out how to escape spaces...  

read back  
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
      "Media_Management": [
        {
          "Created_By": "Jon",
          "Derived_From": "c2faf744-ecb2-490b-bf2d-f39ee01631f1",
          "Document_ID": "751d6cc6-18af-474a-a47b-6625ecf04906",
          "Instance_ID": 2,
          "Original_Document_ID": "6df26f4f-51a7-45cb-b185-b849b60fe47f"
        }
      ]
    }
  ],
  "exitcode": 0
}
```