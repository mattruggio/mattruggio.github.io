---
title: "My Keyboard Broke NBA Live 2005"
date: 2026-09-17
tags: [games, retro-computing, debugging]
description: "Getting NBA Live 2005 running on a second Windows 11 machine broke in two places the first one never did: SafeDisc needed a single CPU core, and a modern keyboard's fifteen HID collections corrupted a 2004 input parser."
image:
  path: /assets/images/og-my-keyboard-broke-nba-live-2005.png
  width: 1200
  height: 630
  alt: "My Keyboard Broke NBA Live 2005"
---

A couple of weeks ago I [got NBA Live 2005 running on a modern laptop](/2026/09/07/nba-live-2005-in-2026/), and by the end of it I thought I had a recipe. Install from the retail disc, add SafeDiscShim so the copy protection can find the driver Microsoft removed, drop in DXVK so the graphics stop flickering. Then I built a desktop and ran the recipe again. The desktop failed in two places the laptop never had.

## The Machine

Here is the machine I used for this:

| Component | Hardware |
| --- | --- |
| Motherboard | ASRock Z790M-ITX WiFi |
| CPU | Intel Core i5-13600K, 14 cores, 20 threads |
| Memory | 32 GB DDR5, 2 x 16 GB G.Skill F5-6000J3636F16G at 6000 MT/s |
| Discrete GPU | NVIDIA GeForce RTX 2060 |
| Integrated GPU | Intel UHD Graphics 770 |
| Storage | Crucial P3 Plus 2 TB NVMe SSD |
| Optical drive | ASUS SDRW-08U9M-U external USB DVD writer |
| Display | LG HDR 4K, 3840 x 2160 at 60 Hz |
| Operating system | Windows 11 Pro 25H2, build 26200.9445, 64-bit |

The laptop in [Part 1](/2026/09/07/nba-live-2005-in-2026/) ran the game on its integrated GPU, and that mattered enormously there. This time I wanted the discrete card to do the work, so the RTX 2060 drove the display throughout. The peripherals were a Corsair K70 CORE TKL keyboard, a Corsair M55 WL mouse, a Logitech F310 gamepad, an ASRock RGB lighting controller, and the onboard Intel wireless Bluetooth.

## The Recipe Was Not a Recipe

I installed from the disc, installed SafeDiscShim, and launched. Nothing happened. The laptop had needed DXVK too, so I added it and launched again, and nothing happened in exactly the same way. On the laptop, DXVK fixed corruption *during gameplay*, which meant the game had already started. This desktop was dying before it drew anything, so whatever was wrong lived somewhere earlier than the graphics. I had reached for a fix because it was in my notes, not because it addressed the symptom in front of me.

## SafeDisc Wanted One Core

Digging through the shim's logs and the Windows event log turned up a pattern I could reproduce: pinned to a single logical processor the game always got through SafeDisc startup, and unpinned it always died about nine seconds in. The i5-13600K is a hybrid part with six performance cores, eight efficiency cores, and twenty logical processors. I cannot tell you what SafeDisc does internally, only that pinning it to one core was the difference.

The restriction only matters during startup. Once SafeDisc has handed off, the game runs across the whole CPU with no constraint left in place. In practice the pin lasts about two seconds.

Setting affinity on the process you launch does not work, because SafeDiscShim relaunches the game and the process you started is not the one that ends up playing. Child processes inherit the affinity mask, though, so the trick is to pin the *launcher*, start the game from inside it, and let inheritance carry the restriction into the process that actually matters. I wrapped that in [a small PowerShell script](https://gist.github.com/mattruggio/a8d0a0ecd13cc3ad56064e415a137b81) that pins itself, launches the game, waits for it to appear, and hands the cores back.

## The Keyboard

With SafeDisc satisfied, the game got further and then died somewhere new. The crash landed in DirectInput, during device enumeration, with a corrupted heap. My Corsair K70 CORE TKL presents **fifteen HID collections** to Windows on its own, before counting the mouse, the gamepad, the Bluetooth radio, or the RGB controller wired to an internal USB header. A modern keyboard is not one device. It is a keyboard, a media controller, a lighting controller, a configuration interface, and a handful of vendor-defined collections, all arriving at once.

NBA Live 2005 enumerates input devices through DirectInput, and DirectInput parses the report descriptor of every HID device on the machine before it hands control back to the application even once. That parser was written for a world where a PC had a keyboard, a mouse, and possibly a joystick. Handed fifteen collections from a single keyboard, it corrupted the heap, and the game died a few seconds later every time. Unplugging things would have worked, and I had no interest in dismantling my desk every time I wanted to play a basketball game, so I built [hidshim](https://github.com/mattruggio/hidshim) instead.

## Where the Filter Had to Sit

The obvious place to intercept this is DirectInput, so that is what I tried first: a proxy `dinput.dll` next to the executable, filtering devices before the game ever saw them. It failed. I tightened it until the game opened no HID device at all, and it still failed, because by the time DirectInput calls back into the application the heap is already gone. There is nothing to filter at that level: the damage happens below it.

So the filter had to sit lower. Enumeration starts in `setupapi.dll`, which would be the perfect place, except that `setupapi` is listed in Windows' `KnownDLLs` registry key: the loader resolves it from the system directory no matter what is sitting next to the executable. You cannot proxy it from an application folder.

`hid.dll` is **not** in `KnownDLLs`, and `dinput.dll` loads it by bare name, which means the application directory gets searched first. That makes it the lowest point in the stack that is both reachable from a game folder and still in front of the parser rather than behind it. There was exactly one place this fix could live.

The shim forwards all forty-seven exports to the real `hid.dll` and filters two of them. `HidD_GetAttributes` fails for any device not on the allow list, so DirectInput drops it before asking anything further, and `HidD_GetPreparsedData` fails for the same devices in case DirectInput reaches for the descriptor without checking attributes first. That second one is the one that has to hold, because it leads directly into the parser. Everything else is a tail jump to the real function.

The configuration is a list of the devices the game is allowed to see, and everything absent from it stops existing as far as that one process is concerned. Mine contains a single line, because the only device NBA Live 2005 needs is the gamepad. The value is the F310's USB vendor and product ID, which it reports when its switch is set to D for DirectInput:

```ini
[Filter]
Enabled=1
AllowDevices=046D:C216
```

With that in place the crash disappeared and the game booted through to the menus. Nothing was installed, no driver, no service, nothing running in the background. Removing it is deleting two files.

## About the Other Route

Patched executables with SafeDisc removed are easy to find in the NBA Live community, and I tested one while working out whether the affinity problem really was SafeDisc. It was: with the check gone, the pin is unnecessary. I went back to the retail disc, because the point of this exercise is to see how far it can go on modern Windows, and SafeDiscShim keeps that intact while a patched binary quietly abandons it. It would not have saved me anyway, since removing SafeDisc leaves the keyboard problem completely untouched.

## What Transferred

DXVK, which [Part 1](/2026/09/07/nba-live-2005-in-2026/) treats as essential, is not part of the working setup on this machine at all. The RTX 2060 renders the game correctly through the native Direct3D 9 path, with none of the corruption that made the laptop unplayable. The fix I was most confident about turned out to be the one tied hardest to hardware I no longer had.

| Fix | Laptop | Desktop |
| --- | --- | --- |
| SafeDiscShim | Required | Required |
| CPU affinity pin | Not needed | Required |
| hidshim | Not needed | Required |
| DXVK | Required | Not needed |

That leaves the question I built the second machine to answer. Two PCs, a game with LAN multiplayer, and a crossover cable's worth of optimism. Does NBA Live 2005 LAN play still work in 2026?

## TL;DR

The recipe from [Part 1](/2026/09/07/nba-live-2005-in-2026/) did not transfer. SafeDisc startup failed until the game was pinned to one logical processor. Then DirectInput crashed parsing a modern keyboard that presents fifteen HID collections on its own, which a proxy `hid.dll` fixes by hiding every device except the gamepad. DXVK, essential on the laptop, was not needed here at all.

## Domain Language

CPU Affinity
: The set of logical processors Windows permits a process to run on. A child process inherits its parent's mask at creation.

DirectInput
: The input API Windows games used for controllers before XInput. It enumerates attached devices once when a process starts rather than rescanning, and parses the report descriptor of every HID device on the machine.

HID Collection
: One logical device inside a physical USB device. A single modern keyboard can present a dozen or more, covering keys, media controls, lighting, and vendor-defined interfaces.

KnownDLLs
: A Windows registry key listing system libraries the loader always resolves from the system directory, ignoring the application folder. A library on this list cannot be proxied by dropping a file beside an executable.

Report Descriptor
: The structure a HID device uses to describe its own inputs and outputs to the operating system. A driver parses it to learn what reports the device will send and how to interpret their contents.

## Further Reading

My [hidshim](https://github.com/mattruggio/hidshim) is the proxy `hid.dll` described here, and its README covers installation, the discovery script for finding your own device identifiers, and the limits: it is 32-bit only, and it hides devices rather than repairing malformed descriptors.

The [launcher script](https://gist.github.com/mattruggio/a8d0a0ecd13cc3ad56064e415a137b81) handles the affinity pin and is commented with what it measured.

Microsoft's [Game Timing and Multicore Processors](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/game-timing-and-multicore-processors) recommends single core affinity for this class of timing bug, though the counter desynchronization it blames should not occur on a CPU this recent.

RibShark's [SafeDiscShim](https://github.com/RibShark/SafeDiscShim) remains the piece both machines needed, restoring the behavior of the kernel driver Microsoft blacklisted rather than defeating the copy protection.

The [DXVK](https://github.com/doitsujin/dxvk) project translates Direct3D 9 into Vulkan, and is worth reaching for only when the game launches and then renders badly. It was the difference between playable and unplayable on the laptop, and this desktop has never loaded it.
