@cisl/io-speaker
===================

Plugin for @cisl/io for interfacing with the speaker-worker

Usage
-----
```
import { registerPlugins, io } from '@cisl/io';
import {registerSpeaker} from '@cisl/io-speaker';
registerPlugins(registerSpeaker);

io.speaker.speak("test");
```