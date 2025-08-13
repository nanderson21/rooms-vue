# Media Asset Management

This section is intended to provide a practical approach to managing assets in the next phase of creative.space software development. This section is in progress and will be developed further over time based on discussions.

## What is an “Asset”?

For our purposes, an “asset” is a record in our database that references one or more files and all or part of the contents within. 

Here are some examples of assets:

* A .mov file

* A folder and the files within it based on an MXF metaclip structure

* A .rdc folder containing video and metadata sidecars from a RED camera

* The video essence of a .mov file and the audio essence of a .wav file

* A clip in DaVinci Resolve and the files it references

* An .mp4 H.264 file

* A .wav audio file

* A .jpeg image file (TIFF or PNG for stills) 

* A RAW image file (Nikon, Sony, Canon variations too)

By tracking assets and how they relate to each other, we can provide an intuitive user experience that hides the complexity of how files exist on the storage.

# 

## What are “Blueprints”?

There are many different ways that files are organized on filesystems. We need a way to inform the system what to expect and where within a folder hierarchy. The concept proposed here is to create “blueprints” that provide the necessary information to parse information from a folder and file structure once pointed at the correct root.

To illustrate the blueprint concept, see the following breakdown of the folder structure used by RED Cinema cameras:

1. \[Camera Roll\]\_\[Roll UUID\].RDM

   1. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\].RDC

      1. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\].rtn

      2. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\]\_\[File Number\].R3D

Here is the another example, this time with Sony XAVC:

1. \[Camera Roll\]

   1. XDROOT

      1. CUEUP.XML

      2. Clip

         1. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].MXF

         2. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].BIM

         3. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].XML

      3. DISCMETA.XML

      4. MEDIAPRO.XML

As you can see from the above, both metaclip folder structures share similar information fields, but put them in different places. This is common across all the manufacturers.

By creating blueprints ourselves and/or or providing the tools to users to build their own, we can make it easier to ingest filesystem contents into our database as assets.

# 

## Tracking Files in Batches

Most of the time, files are created/captured and managed in relation to a group. 

For video and photography source files, this is the \[Camera Roll\] referenced the the example blueprints in the previous section. For sound files, this is known as a Sound Roll. This “Roll” information defines the files as coming from the same batch. For camera and sound rolls, the batch changes every time the capture storage media is formatted. 

Rendered files can also have batches. If I render my Resolve timeline into individual clips with an XML linking them together, I will want these to be in a single folder to better keep track of them. Alternatively, if I render a single clip, I may want to keep multiple formats, such as DNxHR, Prores, and H.264 in the same folder.

Applications reference files through their paths, so these batches provide a unique identifier. Therefore, the relationship between the files and their batch root must be maintained when synchronizing media between systems. Additionally, the relationship between the batch and its root directory must also be maintained. 

## Integrating with Applications

Users create what they care about as assets through applications. 

The process for users is as follows:

1. Generate files

2. Offload files to one or more storage devices

3. Import files into applications, creating app-specific assets

4. Sync audio to video based on timecode or waveform

5. Use assets in app-specific compositions (timelines, shots, documents, etc.)

6. Render app-specific compositions into new files

From the user’s perspective, the files are already turned into assets when they bring them into their applications. Using blueprints allows folders and files to be analyzed as they are offloaded to storage. However, the connecting of video and audio essences is an important step in the workflow that turns the files on the storage into the actual content. From this point on, the folders and files that relate to the video and audio essences are part of this piece of content. Not having either will result in any references to the asset being broken. It is for this reason that integrating with applications is important for properly managing assets.

## Content Trees

Even though there is an objective origination path for content from capture through transcodes, applications, and renders, this path isn’t currently recorded anywhere to make it actionable. The primary goal of the creative.space asset management system is to capture this path information and make it available to the user in practical ways.

Let’s look at a path for a single asset:

1. R3D clip is captured on RED Cinema Camera  
2. Camera Roll is ingested onto creative.space node  
3. RAW metadata is edited in REDCine X  
4. Clip is imported into a DaVinci Resolve project  
5. Clip is synced with audio recorded on a separate device  
6. Clip is rendered into DNxHR HQX Optimized Media in DaVinci Resolve  
7. Clip is colored and rendered into DNxHR OpAtom MXF proxies for Avid Media Composer  
8. AAF is sent from Media Composer to Resolve, relinking with the R3D source clip  
9. Clip is added to a Fusion Comp  
10. Fusion Comp is added to the timeline  
11. Timeline is rendered into a DNxHR HQX OP1a file  
12. DNxHR HQX render is transcoded into an H.264 file

There are two trees that we want to keep track of here. The first is the derivative tree and the second is the material tree.

Here is an example of a derivative tree generated from the above process:

1. R3D clip (Original Camera Format)  
   1. V0 (Original RAW Settings)  
   2. V1 (Edited RAW Settings from RedCineX)  
      1. DaVinci Resolve Clip  
         1. V1 (Video Only)  
         2. V2 (Audio Synced)  
            1. Optimized Media  
               1. DNxHR HQX OpAtom  
2. Fusion Comp  
3. Timeline  
   1. DNxHR HQX Op1A  
      1. H.264

The above tree shows the three assets and the files that derive from them. It is very important to note the dependency created from the RED RAW having multiple versions of RAW settings. Every time these are changed, the content tree breaks and existing derivatives are no longer accurate representations. This is why this information is so important to track. Any change at an earlier stage in the tree necessitates a re-render of the derivatives.

While the derivative tree accurately records the files generated from the original content and their dependencies, it does not actually record the relationships between the three assets. In other words, there is no information that links the R3D clip, the Fusion Comp, and the Timeline. This is what the material tree is for. 

Here is an example of a material tree:

1. Timeline  
   1. Fusion Comp  
      1. Clip  
         1. Video: R3D  
            1. Video Path(s)  
         2. Audio: WAV  
            1. Audio Path(s)  
2. Fusion Comp  
   1. Clip  
      1. Video: R3D  
         1. Video Path(s)  
      2. Audio: WAV  
         1. Audio Path(s)  
3. Clip  
   1. Video: R3D  
      1. Video Path(s)  
   2. Audio: WAV  
      1. Audio Path(s)

By combining the information across these two trees, a user could deduce that in order to recreate the H.264, they would need the DaVinci Resolve Timeline, Fusion Comp, the Clip with audio synced, the metaclip folder and files for the RED media with V2 of the RAW metadata, and the audio file.

# Capture Formats

Profile Cameras  
\- Sony  
\- Blackmagic  
\- Red  
\- Alexa  
\- Panasonic

For each of the Capture Formats, an Input Profile needs to be created that properly maps/tracks the assets through the whole workflow.

Captured files may contain only part of the actual media needed for an artist to work with. 

The actual files arrive as Camera and/or Sound Rolls. Today, these are directly tied to the memory cards used in the Capture Device. This workflow directly mirrors the old Film and Tape workflow, so there is already a bulletproof way to move media through the pipeline using a specific metadata field methodology focused on each of these "Virtual Tape Rolls" (VTRs) as batches using the Tape or Reel Name metadata field. 

# Folder and Bin Structure Templates

A Folder Structure Template should be used to automatically offload the VTRs from the Capture Media to another Storage Device. This Folder Structure ideally is a nearly identical match to the Bin structure that will be used in Resolve. The folder structure for most Capture Formats is overly complex as a bin structure, since the video, audio, and metadata are not always contained in a single file. A Blueprint should be configurable to easily profile a camera's folder structure and then map it to a bin structure using the same regex bin logic that Resolve uses for Reel Names.

The VTR Batches are imported into the Media Pool of a DaVinci Resolve project created from a template. They are brought into a Bin named \[Shoot Date\]-VTR\[\#\#\#\#\]. Ideally, users could create their own bin name structure as part of their template. (See this document for more specifics on the various forms of logic they might use https://docs.google.com/document/d/1Y1ohi1GnUg014vMIOc2T8TJL2HIB2WKX6Y-IMut2O1E/edit) 

# Central Resolve Project Server

A Resolve project is managed by the creative.space server. Users can open it as Read Only and pull media from it. Ideally, the pasteboard can be used to pass metadata from this project to users by loading it in on the server’s Resolve instance  and then presenting it through the Desktop App as part of a task, so the user can  import it into their project. Each user would actually be working in their own sandbox, publishing their updates to the central Resolve project.

Color versions should be copied into the centralized Resolve database for the VTR, along with any timelines that reference the Media. The database should also contain Mapped Mounts for every path that other Nodes used to reference the Media. Each local Node should be given an ID, which can be used as part of the versioning system. 

# Non-Capture Formats

Other than Capture Formats, there are alternate versions of the same Content that have different purposes that need to be managed in relation to the same VTR. 

These forms include:  
\- Live Feeds (SDI/HDMI)  
\- Live Streams (NDI, TS, HLS, etc.)  
\- Proxies (ProRes, DNxHR, Cineform, H.264/5)  
\- Masters (Same as previous and more)  
\- Image Sequences (EXR, TIFF, DPX, etc.)  
\- DaVinci Resolve Cache (.dvcc)

## Live Feeds and Streams

Live Feeds and Streams are used before a file has been created and have the potential to be captured as a Proxy file by a receiving device.

## Proxies

Proxies are files that are optimized for specific performance use cases, such as:  
\- Editorial (I-Frame optimized for Quality over Size)  
\- Web (H.264/5 with LongGOP optimized for Size over Quality)

## Masters

Masters are files that are optimized for the highest quality, so that they can be used to render the final deliverables, such as:  
\- VFX/Color Composite/Shot/Clip  
\- Audio Stem(s)  
\- Rendered Timeline  
\- 3D Model  
\- Texture  
\- Other

## Image Sequences

Image Sequences are folders containing an image file per frame of video. These are ideal for color and VFX workflow, since any glitched or failed renders don't have to be restarted from the beginning. 



# Workflow 1 \- Blueprints

There are many different ways that files are organized on filesystems. We need a way to inform the system what to expect and where within a folder hierarchy. The concept proposed here is to create “blueprints” that provide the necessary information to parse information from a folder and file structure once pointed at the correct root.

To illustrate the blueprint concept, see the following breakdown of the folder structure used by RED Cinema cameras:

1. \[Camera Roll\]\_\[Roll UUID\].RDM

   1. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\].RDC

      1. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\].rtn

      2. \[Camera Roll\]\_\[Clip Number\]\_\[Clip UUID\]\_\[File Part Number\].R3D

Here is another example, this time with Sony XAVC:

1. \[Camera Roll\]

   1. XDROOT

      1. CUEUP.XML

      2. Clip

         1. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].MXF

         2. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].BIM

         3. \[Camera Roll\]\[Clip Number\]\_\[Clip UUID\].XML

      3. DISCMETA.XML

      4. MEDIAPRO.XML

As you can see from the above, both metaclip folder structures share similar information fields, but put them in different places. This is common across all the manufacturers.

By creating blueprints ourselves and/or or providing the tools to users to build their own, we can make it easier to ingest filesystem contents into our database as assets.

# Workflow 2 \- Colorfront

Colorfront forces users to follow a very specific folder structure to import media, just like Avid Media Composer does. This structure allows the application to discern the differences between media and automatically interpret clips properly. Rather than reinvent the wheel, we can copy this same logic for our workflow. 

The ColorFront manual can be found here: [https://colorfront.com/doc/OSD/OSD2018UserGuide.pdf](https://colorfront.com/doc/OSD/OSD2018UserGuide.pdf)

Here is an excerpt from the Manual:

3.1. File structure

One of the most popular file structure used

![][image1]

In the above example, the My\_Project directory is the parent folder for the entire dailies project. 20130409\_day01 is the date directory that contains all of that day’s media. 04090213\_A067 is a CamRoll or folder containing one data card’s clips. Audio folder contains all of the day’s production audio files.

Alternative file structure

![][image2]

Another approach is to further separate CamRolls by camera letter. Here we have an A and a B camera directory. This allows OSD to understand which CamRolls were shot with a particular camera or camera angle, and then append the camera letter to the rendered clip names in AVID or Final Cut.

There is two ways to set up a project: create an empty project with no media inside and use the Copy Central to ingest media, or to create the media folders manually or by third party app and let system parse it. There are a number of different folder structures/hierarchies supported by the parse engine:

| Structure  | Function |
| :---- | :---- |
| ProjectBasePath/LabRoll | Use this to quickly view files without any organization. |
| ProjectBasePath/TransferDate/LabRoll | CamRolls and audio folder are placed directly within the date directory \- this is the most popular structure |
| ProjectBasePath/TransferDate/Camera /LabRoll | CamRolls go into sub-folders based on camera angles (A, B, C, etc.). If this information is not in the header in the CamRoll info (typically the first letter of the CamRoll) this may be required |
| ProjectBasePath/TransferDate/Camera Format/LabRoll | Media types go into sub-folders based on camera/format type (e.g. RED, Alexa, Canon 5D, etc.). This may be required if different lenses are used on the same types of cameras, which require different node settings. In this case anamorphic footage should be placed under a different format folder, so the system will use a dedicated grade template for that format. |
| ProjectBasePath/CameraFormat/Trans ferDate /LabRoll | CamRolls go into date sub-folders within master camera type directories. Similar to the above. |
| ProjectBasePath/Episode/CameraForm at/LabRoll | If Episode is something to track (e.g. reports or the ALE should indicate it) it may be used as the main organization structure. |

Using any of the above folder layouts the application can work with any camera original format in the same project. If the CameraFormat metadata is not part of the path structure, it is automatically detected. If there is a need to use different image processing pipelines for some media coming from the same camera (like footage shot with different lenses but the same camera), the automatic detection may be impossible and it is suggested to use a folder structure with the CameraFormat tag in it, and copy the media into their respective subfolder.

# Role Breakdown

[Media Asset(s)](#media-asset\(s\))

[Video](#video)

[Source](#heading=h.5627kxxptpt6)

[Master](#heading=h.ul1pxn5gw38q)

[Mezzanine](#heading=h.jiyw402icwwa)

[Proxy](#heading=h.ix31cqjpyhje)

[Audio](#heading=h.5f6hizs6kobq)

[Source](#heading=h.tewd2euccs8t)

[Music](#heading=h.2j15c5cvzfn0)

[Sound Effects](#heading=h.jrsh2z670jfu)

[Mixes](#heading=h.h4ojpfsmf0tc)

[Voiceover/ADR](#heading=h.avvnu0eylbkh)

[VFX](#heading=h.51u925d0yo8y)

[VFX Shots](#heading=h.3g6xav8pjm8x)

[Working Folder](#heading=h.4xo9hb2momzu)

[VFX Elements](#vfx-elements)

[Working Folder](#heading=h.m3zj8l2tkkh5)

[Final Assets](#heading=h.dyfrwvb3voji)

[Reference Renders](#heading=h.wtcbwz9tn57z)

[Editor VFX](#heading=h.m16txwnje7ge)

[Graphics (GFX)](#heading=h.pijwxnyoomch)

[Source](#heading=h.v6r5yiue88l1)

[Behind the Scenes](#heading=h.tb0xk9a38evc)

[Images](#heading=h.7c6imu43r3a7)

[Other](#heading=h.bfktqz21pr9m)

[Project File(s)](#heading=h.19meqilc9380)

[Editorial](#heading=h.jxnplarsmnd6)

[VFX](#heading=h.8xc0l42br17w)

[Compositing](#heading=h.z8ntjcxh21fm)

[Animation](#heading=h.8vnak1wl3mi6)

[CGI](#heading=h.v7r9e4908sn4)

[Color](#heading=h.a1xm6kom66ep)

[Audio](#heading=h.67vjkrb3yg0t)

[Finishing](#heading=h.lod46x4sfcba)

[Editorial Picture Lock](#heading=h.jji9qbddjltr)

[Editor to Color](#heading=h.xtexr48b85nm)

[Editor to Audio](#heading=h.8zu4j7y8yjts)

[Editor to VFX](#heading=h.u68sxccsfbl3)

[Color Finish](#heading=h.fzj3th26hbpo)

[Color to Editor](#heading=h.sq5opewsxhzy)

[Color to Audio](#heading=h.3suizs1xw9u8)

[Color to VFX](#heading=h.vrvziw8m2tah)

[Audio Finish](#heading=h.2ojiyy34k790)

[Audio to Editor](#heading=h.m0o76z9o1txt)

[Audio to Color](#heading=h.h56lgefn0xsk)

[Audio to VFX](#heading=h.8to7n2wz96ds)

[VFX Delivery](#heading=h.ad5maam4xkq7)

[VFX to Editor](#heading=h.48ggj2d3ms76)

[VFX to Color](#heading=h.o7n7gv78184d)

[VFX to Audio](#heading=h.tff27xitcv1j)

[Master](#heading=h.wtrp38vftwue)

[Exports](#heading=h.29rb52o3y780)

[Review](#heading=h.vr9wgkdixgm7)

[Editorial](#heading=h.kkszoypkw1l)

[Audio](#heading=h.vagb9avms3f6)

[Color](#heading=h.wiiozs9xi9mb)

[VFX](#heading=h.d6i5ul7jmeiu)

[Deliverables](#heading=h.cttqj2mf6o37)

[Editorial](#heading=h.hcs0crs3k7wq)

[Audio](#heading=h.2nd8wp8p9g)

[Color](#heading=h.2iwvwetv7cy4)

[VFX](#heading=h.mwyf4akrvjq4)

[Master](#heading=h.gzbzpbfvn68v)

[Master](#heading=h.7n3nn43590ft)

[Archival](#heading=h.4ski4pqimqnh)

[Web](#heading=h.sh30hn60zkr7)

[Broadcast](#heading=h.q16oqa78zb7t)

[Other](#heading=h.7zdi7qtol5hg)

[Documents](#heading=h.j434mzxmd468)

# Media Asset(s) {#media-asset(s)}

Media Assets are video, audio, and image files. These have special metadata associated with them and can have relational information as well.

## Video {#video}

Video assets have some unique properties. Some video assets are a single video clip others are a collection of images in a sequence. Also, a single video asset can have several forms, such as Master, Proxy, Mezzanine, etc. These require special analysis.

### Source

Source assets are from production directly from the media in the camera. This is whatever format the camera natively captures. These files may be used throughout the post production process or master files may be used instead. In many cases, the source files are the highest quality form of the asset, but sometimes they can be lower quality than a master, such as in the case of DSLR and consumer cameras.

Formats:

- REDCODE RAW (.R3D)  
- SonyRAW (.MXF)  
- XAVC (.MXF)  
- H.264 (.MP4 or .MOV)  
- ProRes (.MOV)  
- DNx (.MXF or .MOV)  
- Phantom Cine (.CINE)  
- AVC-HD (.mts)

### Master

Master assets are video clips that are created from the source clips to be used for the final master. These may or may not be in the same format as mezzanine assets would be. The creation of these files is rare and typically would be in lieu of Mezzanine clips. In theory, these are just higher quality mezzanine clips that are used for final master instead of relinking to source.

Formats:

- XAVC (.MXF)  
- ProRes (.MOV)  
- DNx (.MXF or .MOV)  
- Cineform (.MOV or .AVI)  
- DPX (.DPX)  
- OpenEXR (.EXR)  
- TIFF (.TIFF)

### Mezzanine

Mezzanine assets are video clips that were created from the source material to be used during the editorial process. This is typically done either to make processing easier on a workstation, provide editors with colored assets to work with, and/or sync audio. These are also commonly referred to as proxies or more accurately editorial proxies.

Formats:

- XAVC (.MXF)  
- ProRes (.MOV)  
- DNx (.MXF or .MOV)  
- Cineform (.MOV or .AVI)

### Proxy

Proxy assets in general are lower quality versions of other clips created because they are smaller in size and bandwidth requirement. In relation to this system, it refers specifically to H.264 files used for reference only.

These files may be generated on set but, if they are not, will need to be created upon ingest.

## Audio

Audio roles are not nearly as important as video roles in developing context. Other than Source, the others are mainly drop folders. The purpose of having these roles is to allow editors to put their assets in folders based on what they wish to use as terms.

### Source

Any audio files captured during production. These assets are archived upon ingest with the source video. These have an organizational structure based on the date captured and sound roll.

### Music

This role means that any assets falling within are related to music.

### Sound Effects

This role is for any non-dialogue sound files that were created after production.

### Mixes

This role is for rendering audio files of a sound mix. This is used when a sound designer/mixer sends sample mixes to the editor to use in the edit for reference or final export.

### Voiceover/ADR

This role if for any non-production dialogue sound clips. These can be for a voiceover or rerecording of dialogue that was unusable from production sound.

## VFX

VFX roles are very important and unique in comparison to the other roles. While they fall under editorial, they denote folders where underneath artists can work as they wish.

### VFX Shots

There is only one role underneath VFX shots. This is because the other role that should be here is actually under deliverables. These would be VFX renders for review, editorial, or master.

#### Working Folder

The VFX Shot working folder is a “sandbox” where VFX artists can work and organize their own folders. VFX artist will create VFX shots in SneakyAccess which will create folders with the shot name, which is sequential upon creation.

### VFX Elements {#vfx-elements}

#### Working Folder

This role is identical in function to the VFX Shots/Working Folder role. The only difference is that the assets being generated here are simply CGI elements that will be used in the VFX Shots.

#### Final Assets

This role marks a folder containing finished elements which VFX artists can use in their shots.

#### Reference Renders

This role marks a folder containing reference elements for previs work or review prior to completion of the element.

### Editor VFX

This role is for folders containing assets related to effects created by the editor. This is primarily renders baking in effects during editorial. These can also be VFX proxies created by the editor through dynamic linking with After Effects.

## Graphics (GFX)

The graphics roles are basic like the sound roles.

### Source

This role marks a folder containing images in the format and folder structure offloaded from a camera card. These are typically from production. The folder structure matches the camera roll and offload date.

### Behind the Scenes

This role is for a folder containing stills relating to the process of making of a project. These stills may be found in the source folder in many cases, but this role may be needed when not OR when edited stills need to be saves.

### Images

This role is a catch-all for any image files that are used in the edit.

# Project File(s)

Project file roles are crucial as they let SneakyBase know what project files to seach for and analyze.

## Editorial

The editorial role searches for Adobe Premiere project files. It keeps track of all the project files based on naming, creation date, and modified date. It allows SneakyAccess to present the editor at all times with the most recent version of a project. It also allows SneakyBase to keep a record of all the file paths that the project files are looking for and can provide utility functions to archive and restore these assets when needed.

## VFX

There are multiple VFX project roles as there are multiple types of VFX work and different programs that they use. 

### Compositing

This correlates with “Shots”. Compositing projects/scripts are created in Nuke X, Fusion Studio, After Effects, and Flame.

### CGI

This correlates with “Elements”. Computer Generated Imagery (CGI) focused applications used by Sneaky Big Studios include Maya, 3ds Max, and Cinema 4D. 

## Color

DaVinci Resolve projects are unique in that they are not contained in project files but are part of a database. Resolve has 2 kinds of databases, Disk and Postgres. This role is intended to allow SneakyBase to understand where the Resolve project is and analyze the folder structure. While other project files are stored on network storage, these project folders will always be on a local harddrive.

Also, there are DaVinci Resolve project files, .drp(s), but they are meant for importing into a database. They are not active projects but zipped snapshots.

## Audio

Audio sessions can be either on local storage or on the MediaGrid. This role will mark a folder as containing session files from Protools 12, Logic, or Adobe Audition.

# Finishing

The finishing roles are unique in that their only purpose is to mark folders that are solely for bundling assets for transfer between departments. These bundles are also advantageous for archiving and restoring assets to enable future work.

## Editorial Picture Lock

This role is for a project managed folder generated once the editor has reached picture lock. If the editor is not proficient enough to create the other finishing folders, this bundle can be used to generate the remaining finishing folders. This bundle contains a Premiere Pro project file and a single folder with all of the used assets.

## Editor to Color

This role is for a project managed folder generated for the colorist. The only major difference between this and the picture lock is that the editor may have prepared a special sequence that is more managed and created baked in clips of any effects. This bundle contains a Premiere Pro project file and a single folder with all of the used assets.

## Editor to Audio

This role is for a folder containing the assets needed from an editor for a sound designer or mixer to begin working. This is typically an OMF from Premiere, but may an AAF from Resolve.

## Editor to VFX

This role is for folders where an editor has prepared assets to send to a VFX artist for a particular shot.

## Color Finish

This role is for a folder containing the completed media managed assets and project from Resolve at the end of the color process. 

## Color to Editor

This role is for folders containing assets from the colorist for an editor. This is typically used for dailies when a colorist is sending full assets with color to be relinked but may also be a roundtrip or flattened video for the editor to complete the edit with.

## Color to Audio

This role is for the rare cases a colorist has to make changes to the edit and is sending assets to a sound designer or sound mixer. These are almost always AAF files and consolidated assets.

## Color to VFX

This role is for a colorist to send colored or color managed VFX pulls to the VFX artists.

## Audio Finish

This role is for folders containing all the finished assets of an audio session for a project. This must include every single asset used in the session. The goal is that the folder with this role could be restored later and work could continue on the project.

## Audio to Editor

This role if for folders from a sound designer or mixer to send assets to the editor. Typically these are mixes for review.

## Audio to Color

This role is for folders where a sound designer or mixer is sending audio files to be laid into a color timeline, typically for review with the client after picture lock.

## Audio to VFX

This role is for folders in which a sound designer or mixer has created assets meant to assist a VFX artist with timing of effects.

## VFX Delivery

This role is for folders containing the finished assets and project files from a VFX artist to create a particular shot or element.

## VFX to Editor

This role is for folders containing assets from VFX meant to be used by the editor to put in the edit until completed assets are created.

## VFX to Color

This role is for folders containing assets from VFX meant to be used by the colorist until completed assets are created.

## VFX to Audio

This role is for folders from a VFX artist to a sound designer or mixer to provide timed sound effect not possible from the source footage.

## Master

This role is for a folder containing all the assets needed to bring back a project in the future and recommence work. This criteria is variable and based on negotiation with the client. It is typically a combination of the other finishing folders or a project manage of the final online edit used to create the master deliverable.

# Exports

Export roles denote folders containing assets created by combining other assets or assets generated by software rather than cameras.

## Review

These roles relate to exports meant for a review and approval process during each of the phases of Post Production.

### Editorial

This role is for edits that are ready for review. Assets are analyzed based on naming structure for version information.

### Audio

This role is for sound mixes that are ready for review. Assets are analyzed based on naming structure for version information.

### Color

This role is for color passes that are ready for review. Assets are analyzed based on naming structure for version information.

### VFX

This role is for vfx shots that are ready for review. Assets are analyzed based on naming structure for version information.

## Deliverables

These roles relate to high quality assets generated upon completion of a stage of post production.

### Editorial

This role is for high quality renders of a picture locked edit. These are video files or image sequences.

### Audio

This role is for high quality renders of the audio mix. These are .wav or .aiff files.

### Color

This role is for high quality renders of the colored timeline. These are video files or image sequences.

### VFX

This role is for high quality renders of VFX shot. These are video files or image sequences.

### Master

This role is for a folder and subfolders containing a representation of the final piece combining all the product of the stages of post production.

#### Master

This sub-role is for a folder that contains the highest quality of the final cut of a project used for the encoding of other formats.

#### Archival

This sub-role is for a folder that contains a version of the final cut of a project that can be brought back in the future and used to generate a higher quality master. This is for projects graded in ACES where an archive master can be made in linear.

#### Web

This sub-role is for a folder that contains a transcoded version of the master intended for web distribution.

#### Broadcast

This sub-role is for a folder that contains a transcoded version of the master intended for broadcast.

# Other

This role is for any folder that contains non-media assets.

## Documents

This sub-role is for any folder containing text information.

# 

# 