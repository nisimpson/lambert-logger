import { Logform } from "winston";

/** Extacted log context information. */
export type ExtractedInfo = {
  /** String interpolation splat for %d %s-style messages. */
  splat: unknown[];
  /** Log message; could be a string or object. */
  message: unknown;
};

/**
 * Options passed into a user transform function when it is invoked.
 */
export interface UserTransformOptions extends Record<string, unknown> {
  /**
   * Extracts contextual information from the info object.
   *
   * @param info The winston log message context.
   * @return {@link ExtractedInfo} object containing the context.
   */
  unpack: (info: Logform.TransformableInfo) => ExtractedInfo;

  /**
   * Saves the specified data to the info object.
   *
   * @param info The winston log message context.
   * @param extracted The extracted {@link ExtractedInfo} object obtained from
   * unpacking.
   */
  pack: (info: Logform.TransformableInfo, extracted: Partial<ExtractedInfo>) => void;
}

/**
 * A function that can manupulate log information before it is sent to a transport.
 *
 * @param info The winston log message context.
 * @param opts Optional function parameters.
 * @returns A falsey value, or the log message context.
 */
export type UserTransformFunction = (
  info: Logform.TransformableInfo,
  opts: UserTransformOptions
) => boolean | Logform.TransformableInfo;
