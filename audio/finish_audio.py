#!/usr/bin/env python3
"""one linear gain to -14 LUFS, then a -1 dBFS peak limiter on the whole mix (nothing else)"""
import sys
import numpy as np
from dsp import read_wav, write_wav, integrated, true_peak
from mix import peak_cap
x, sr = read_wav(sys.argv[1])
L = integrated(x)
y = x * 10 ** ((-14.0 - L) / 20)
y = peak_cap(y, 10 ** (-1.3 / 20), look=0.002, rel=0.05)
write_wav(sys.argv[2], y)
print(f"in {L:.2f} LUFS -> out {integrated(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP")
