/**
 * @winstonlu/dsh-eva-skin host half.
 *
 * The skin lives entirely in the browser half (`lib/client.js`): one stylesheet
 * plus two flag attributes on <html>. This half exists because a bundle row
 * needs a host module to mount, and it deliberately does nothing.
 */
export const name = '@winstonlu/dsh-eva-skin';
export const inject = [];

export function apply() {
  // intentionally empty: no host services, no routes, no config
}
