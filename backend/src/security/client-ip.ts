import { isIPv4, isIPv6 } from 'net';

// The key a client IP is counted under, or null if the value isn't an IP.
// IPv4 as is. IPv6 by its /64: one home or phone usually gets a whole
// /64, so counting single addresses would let someone rotate through
// billions of them. An IPv4 address written as IPv6 (::ffff:1.2.3.4) is
// counted as the IPv4 address it is.
export function clientIpKey(value: string | undefined): string | null {
  const ip = value?.trim();
  if (!ip) return null;
  if (isIPv4(ip)) return ip;
  if (!isIPv6(ip)) return null;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped && isIPv4(mapped[1])) return mapped[1];
  return `${expandIPv6(ip).slice(0, 4).join(':')}::/64`;
}

// Eight four-digit groups, so equal addresses written differently
// ("2001:db8::1" and "2001:0db8:0:0::1") get the same key.
function expandIPv6(ip: string): string[] {
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = ip.includes('::') && tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  return groups.map((group) => group.padStart(4, '0'));
}
