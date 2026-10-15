"""
Pure standard-library Python PNG generator for WorkshopHub PWA icons.
No external packages (Pillow/cv2) required.
"""
import zlib
import struct
import os

def create_png(width, height, fill_color, border_radius=0):
    # RGBA image buffer
    raw_data = bytearray()
    
    r_bg, g_bg, b_bg, a_bg = fill_color # (79, 70, 229, 255) - Indigo 600
    r_fg, g_fg, b_fg, a_fg = (255, 255, 255, 255) # White
    r_ac, g_ac, b_ac, a_ac = (99, 102, 241, 255) # Light Indigo
    
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            # Check rounded corner radius
            corner = False
            if border_radius > 0:
                dx = max(0, max(border_radius - x, x - (width - 1 - border_radius)))
                dy = max(0, max(border_radius - y, y - (height - 1 - border_radius)))
                if dx * dx + dy * dy > border_radius * border_radius:
                    corner = True
            
            if corner:
                raw_data.extend((0, 0, 0, 0)) # transparent
                continue

            # Inner calendar body
            cal_left = int(width * 0.2)
            cal_right = int(width * 0.8)
            cal_top = int(height * 0.22)
            cal_bottom = int(height * 0.82)
            cal_header_bottom = int(height * 0.38)

            # Draw calendar
            if cal_left <= x <= cal_right and cal_top <= y <= cal_bottom:
                if y <= cal_header_bottom:
                    raw_data.extend((r_ac, g_ac, b_ac, a_ac))
                else:
                    # Calendar date grid dot or lightning shape
                    center_x, center_y = width // 2, int(height * 0.6)
                    dist = abs(x - center_x) + abs(y - center_y)
                    if dist < width * 0.12:
                        raw_data.extend((r_bg, g_bg, b_bg, a_bg))
                    else:
                        raw_data.extend((r_fg, g_fg, b_fg, a_fg))
            else:
                raw_data.extend((r_bg, g_bg, b_bg, a_bg))

    # Compress IDAT chunk
    compressed = zlib.compress(bytes(raw_data), 9)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    png_header = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0) # 8-bit RGBA
    
    return png_header + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")

if __name__ == "__main__":
    os.makedirs("icons", exist_ok=True)
    
    # 192x192
    with open("icons/icon-192.png", "wb") as f:
        f.write(create_png(192, 192, (79, 70, 229, 255), border_radius=40))
        
    # 512x512
    with open("icons/icon-512.png", "wb") as f:
        f.write(create_png(512, 512, (79, 70, 229, 255), border_radius=110))
        
    # favicon 64x64
    with open("icons/favicon.png", "wb") as f:
        f.write(create_png(64, 64, (79, 70, 229, 255), border_radius=12))

    print("Icons successfully created in icons/")
