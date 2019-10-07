import { Io } from '@cisl/io/io';
import amqplib from 'amqplib';
import { Rabbit } from '@cisl/io/rabbitmq';

declare module '@cisl/io/io' {
  interface Io {
    speaker: Speaker;
  }
}

type SpeakSubscriptionCallback = (content: any, message: amqplib.ConsumeMessage) => void;

export class Speaker {
  public max_speaker_duration: number = 1000 * 20; // 20 seconds;
  public rabbit: Rabbit;

  public constructor(io: Io) {
    if (!io.rabbit) {
      throw new Error('Must initialize RabbitMQ module for Io');
    }
    this.rabbit = io.rabbit;
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

    return this.rabbit.publishRpc('rpc-speaker-speakText', options, { expiration: options.duration });
  }

  /**
   * Increase speaker volume.
   * @param  {number} [change=20] - The change amount. The full range of the volume is from 0 to 120.
   * @returns {Promise} Resolves to "done".
   */
  public increaseVolume(change = 20): Promise<any> {
    return this.rabbit.publishRpc('rpc-speaker-changeVolume', JSON.stringify({ change }));
  }

  /**
   * Reduce speaker volume.
   * @param  {number} [change=20] - The change amount. The full range of the volume is from 0 to 120.
   * @returns {Promise} Resolves to "done".
   */
  public reduceVolume(change = 20): Promise<any> {
    return this.rabbit.publishRpc('rpc-speaker-changeVolume', JSON.stringify({ change: -change }));
  }

  /**
   * Stop the speaker.
   * @returns {Promise} Resolves to "done".
   */
  public stop(): Promise<any> {
    return this.rabbit.publishRpc('rpc-speaker-stop', '');
  }

  /**
   * Subscribe to begin-speak events.
   * @param  {speakSubscriptionCallback} handler - The callback for handling the speaking events.
   */
  public onBeginSpeak(handler: SpeakSubscriptionCallback): void {
    this.rabbit.onTopic('begin.speak', (response): void => {
      handler(response.content, response.message);
    });
  }

  /**
   * Subscribe to end-speak events.
   * @param  {speakSubscriptionCallback} handler - The callback for handling the speaking events.
   */
  public onEndSpeak(handler: SpeakSubscriptionCallback): void {
    this.rabbit.onTopic('end.speak', (response): void => {
      handler(response.content, response.message);
    });
  }
}

export function registerSpeaker(io: Io): void {
  io.speaker = new Speaker(io);
}
