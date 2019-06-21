import { Io, RabbitMQ, FieldsAndProperties } from '@cisl/io';

declare module '@cisl/io' {
  interface Io {
    speaker: Speaker;
  }
}

type SpeakSubscriptionCallback = (content: any, headers: FieldsAndProperties) => void;

export class Speaker {
  public max_speaker_duration: number = 1000 * 20; // 20 seconds;
  public mq: RabbitMQ;

  public constructor(io: Io) {
    if (!io.mq) {
      throw new Error('Must initialize RabbitMQ module for Io');
    }
    this.mq = io.mq;
  }

  /**
   * Speak text.
   * @param  {string} text - The text to speak out.
   * You can also use SSML. See [Watson TTS website](http://www.ibm.com/watson/developercloud/doc/text-to-speech/http.shtml#input).
   * @param  {Object} [options] - Speak options.
   * @param  {number} options.duration=20000 - The max non-stop speak duration. Defaults to 20 seconds.
   * @param  {string} options.voice - The voice to use. The default depends on the setting of speaker-worker.
   * For English (US), there are en-US_AllisonVoice, en-US_LisaVoice, and en-US_MichaelVoice.
   * For a full list of voice you can use, check [Watson TTS website](http://www.ibm.com/watson/developercloud/doc/text-to-speech/http.shtml#voices).
   * @returns {Promise<Object>} Resolves to "succeeded" or "interrupted".
   */
  public speak(text: string, options: any = {}): Promise<any> {
    if (!options.duration) {
      options.duration = this.max_speaker_duration;
    }
    options.text = text;

    return this.mq.callJson('rpc-speaker-speakText', options, { expiration: options.duration });
  }

  /**
   * Increase speaker volume.
   * @param  {number} [change=20] - The change amount. The full range of the volume is from 0 to 120.
   * @returns {Promise} Resolves to "done".
   */
  public increaseVolume(change = 20): Promise<any> {
    return this.mq.call('rpc-speaker-changeVolume', JSON.stringify({ change }));
  }

  /**
   * Reduce speaker volume.
   * @param  {number} [change=20] - The change amount. The full range of the volume is from 0 to 120.
   * @returns {Promise} Resolves to "done".
   */
  public reduceVolume(change = 20): Promise<any> {
    return this.mq.call('rpc-speaker-changeVolume', JSON.stringify({ change: -change }));
  }

  /**
   * Stop the speaker.
   * @returns {Promise} Resolves to "done".
   */
  public stop(): Promise<any> {
    return this.mq.call('rpc-speaker-stop', '');
  }

  public beginSpeak(msg: string): void {
    this.mq.publishTopic('begin.speak', JSON.stringify(msg));
  }

  public endSpeak(msg: string): void {
    this.mq.publishTopic('end.speak', JSON.stringify(msg));
  }

  /**
   * Subscribe to begin-speak events.
   * @param  {speakSubscriptionCallback} handler - The callback for handling the speaking events.
   */
  public onBeginSpeak(handler: SpeakSubscriptionCallback): void {
    this.mq.onTopicJson('begin.speak', (content, headers): void => {
      handler(content, headers);
    });
  }

  /**
   * Subscribe to end-speak events.
   * @param  {speakSubscriptionCallback} handler - The callback for handling the speaking events.
   */
  public onEndSpeak(handler: SpeakSubscriptionCallback): void {
    this.mq.onTopicJson('end.speak', (content, headers): void => {
      handler(content, headers);
    });
  }
}

export function registerSpeaker(io: Io): void {
  io.speaker = new Speaker(io);
}
