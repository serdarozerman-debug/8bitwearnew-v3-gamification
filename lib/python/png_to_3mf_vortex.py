#!/usr/bin/env python3
"""
Pixel Art PNG to 3MF Converter with Vortexcolor Format
Generates multi-color 3MF files compatible with Vortexcolor multi-material printers
"""

import sys
import os
import json
import argparse
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Missing dependency: {e}. Install: pip install Pillow numpy"
    }))
    sys.exit(1)


def create_vortexcolor_3mf(png_path, output_3mf_path, extrusion_height=2.0, base_thickness=1.0, pixel_size=1.5):
    """
    Convert pixel art PNG to Vortexcolor 3MF format.
    
    Vortexcolor format specifications:
    - Uses vertex colors for multi-material support
    - Each pixel becomes a colored voxel
    - Colors are stored in <basematerials> and referenced per triangle
    """
    
    # 1. Load PNG
    try:
        img = Image.open(png_path).convert('RGBA')
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to load PNG: {e}"
        }
    
    width, height = img.size
    pixels = np.array(img)
    
    # 2. Collect unique colors and build color map
    color_map = {}  # RGB tuple -> material ID
    materials = []  # List of (r, g, b) tuples
    
    vertices_list = []
    triangles_list = []
    vertex_counter = 0
    opaque_pixel_count = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[y, x]
            
            # Skip transparent pixels
            if a < 128:
                continue
            
            opaque_pixel_count += 1
            
            # Register color
            color_key = (r, g, b)
            if color_key not in color_map:
                color_map[color_key] = len(materials)
                materials.append(color_key)
            
            material_id = color_map[color_key]
            
            # Calculate 3D position (flip Y for PNG coordinate system)
            x_pos = x * pixel_size
            y_pos = (height - 1 - y) * pixel_size
            z_base = 0
            z_top = extrusion_height
            
            # Create cube vertices (8 vertices per cube)
            cube_verts = [
                (x_pos, y_pos, z_base),                              # 0
                (x_pos + pixel_size, y_pos, z_base),                # 1
                (x_pos + pixel_size, y_pos + pixel_size, z_base),  # 2
                (x_pos, y_pos + pixel_size, z_base),                # 3
                (x_pos, y_pos, z_top),                              # 4
                (x_pos + pixel_size, y_pos, z_top),                # 5
                (x_pos + pixel_size, y_pos + pixel_size, z_top),  # 6
                (x_pos, y_pos + pixel_size, z_top),                # 7
            ]
            
            base_idx = vertex_counter
            vertices_list.extend(cube_verts)
            vertex_counter += 8
            
            # Create 12 triangular faces (2 per cube face)
            cube_faces = [
                # Bottom
                (base_idx+0, base_idx+2, base_idx+1, material_id),
                (base_idx+0, base_idx+3, base_idx+2, material_id),
                # Top
                (base_idx+4, base_idx+5, base_idx+6, material_id),
                (base_idx+4, base_idx+6, base_idx+7, material_id),
                # Front
                (base_idx+3, base_idx+7, base_idx+6, material_id),
                (base_idx+3, base_idx+6, base_idx+2, material_id),
                # Back
                (base_idx+0, base_idx+1, base_idx+5, material_id),
                (base_idx+0, base_idx+5, base_idx+4, material_id),
                # Left
                (base_idx+0, base_idx+4, base_idx+7, material_id),
                (base_idx+0, base_idx+7, base_idx+3, material_id),
                # Right
                (base_idx+1, base_idx+2, base_idx+6, material_id),
                (base_idx+1, base_idx+6, base_idx+5, material_id),
            ]
            
            triangles_list.extend(cube_faces)
    
    if opaque_pixel_count == 0:
        return {
            "success": False,
            "error": "No opaque pixels found in PNG"
        }
    
    # 3. Add base plate (single color - first material or black)
    base_material_id = 0
    base_verts = [
        (0, 0, -base_thickness),
        (width * pixel_size, 0, -base_thickness),
        (width * pixel_size, height * pixel_size, -base_thickness),
        (0, height * pixel_size, -base_thickness),
        (0, 0, 0),
        (width * pixel_size, 0, 0),
        (width * pixel_size, height * pixel_size, 0),
        (0, height * pixel_size, 0),
    ]
    
    base_idx = vertex_counter
    vertices_list.extend(base_verts)
    vertex_counter += 8
    
    base_faces = [
        (base_idx+0, base_idx+2, base_idx+1, base_material_id),
        (base_idx+0, base_idx+3, base_idx+2, base_material_id),
        (base_idx+4, base_idx+5, base_idx+6, base_material_id),
        (base_idx+4, base_idx+6, base_idx+7, base_material_id),
        (base_idx+3, base_idx+7, base_idx+6, base_material_id),
        (base_idx+3, base_idx+6, base_idx+2, base_material_id),
        (base_idx+0, base_idx+1, base_idx+5, base_material_id),
        (base_idx+0, base_idx+5, base_idx+4, base_material_id),
        (base_idx+0, base_idx+4, base_idx+7, base_material_id),
        (base_idx+0, base_idx+7, base_idx+3, base_material_id),
        (base_idx+1, base_idx+2, base_idx+6, base_material_id),
        (base_idx+1, base_idx+6, base_idx+5, base_material_id),
    ]
    
    triangles_list.extend(base_faces)
    
    # 4. Create 3MF XML structure
    # Create root model
    model = ET.Element('model', unit='millimeter')
    model.set('xmlns', 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02')
    model.set('xmlns:m', 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02')
    
    # Resources section
    resources = ET.SubElement(model, 'resources')
    
    # Add base materials (colors)
    basematerials = ET.SubElement(resources, 'm:basematerials', id='1')
    for mat_id, (r, g, b) in enumerate(materials):
        # Convert RGB to hex format #RRGGBB
        color_hex = f"#{r:02X}{g:02X}{b:02X}"
        ET.SubElement(basematerials, 'm:base', name=f"Color_{mat_id}", displaycolor=color_hex)
    
    # Add mesh object
    obj = ET.SubElement(resources, 'object', id='2', type='model')
    mesh = ET.SubElement(obj, 'mesh')
    
    # Add vertices
    vertices_elem = ET.SubElement(mesh, 'vertices')
    for v in vertices_list:
        ET.SubElement(vertices_elem, 'vertex', x=f"{v[0]:.6f}", y=f"{v[1]:.6f}", z=f"{v[2]:.6f}")
    
    # Add triangles with material references
    triangles_elem = ET.SubElement(mesh, 'triangles')
    for tri in triangles_list:
        v1, v2, v3, mat_id = tri
        # Reference material group and material index
        ET.SubElement(triangles_elem, 'triangle', 
                     v1=str(v1), v2=str(v2), v3=str(v3),
                     pid='1', p1=str(mat_id))
    
    # Build section (what to print)
    build = ET.SubElement(model, 'build')
    ET.SubElement(build, 'item', objectid='2')
    
    # 5. Create 3MF package (ZIP file)
    try:
        # Create XML string
        model_xml = ET.tostring(model, encoding='unicode', method='xml')
        model_xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + model_xml
        
        # Create .rels file for relationships
        rels_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>'''
        
        # Create content types file
        content_types_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>'''
        
        # Create ZIP file
        with zipfile.ZipFile(output_3mf_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('[Content_Types].xml', content_types_xml)
            zf.writestr('_rels/.rels', rels_xml)
            zf.writestr('3D/3dmodel.model', model_xml)
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create 3MF: {e}"
        }
    
    # 6. Calculate statistics
    file_size_bytes = os.path.getsize(output_3mf_path)
    
    return {
        "success": True,
        "stats": {
            "width_mm": round(width * pixel_size, 2),
            "height_mm": round(height * pixel_size, 2),
            "depth_mm": round(extrusion_height + base_thickness, 2),
            "pixel_width": width,
            "pixel_height": height,
            "opaque_pixels": opaque_pixel_count,
            "unique_colors": len(materials),
            "total_triangles": len(triangles_list),
            "total_vertices": len(vertices_list),
            "file_size_kb": round(file_size_bytes / 1024, 2),
            "format": "3MF Vortexcolor",
            "materials": [f"#{r:02X}{g:02X}{b:02X}" for r, g, b in materials]
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description='Convert pixel art PNG to Vortexcolor 3MF for multi-color 3D printing'
    )
    parser.add_argument('input_png', help='Input PNG file path')
    parser.add_argument('output_3mf', help='Output 3MF file path')
    parser.add_argument('--extrusion', type=float, default=2.0, 
                       help='Extrusion height in mm (default: 2.0)')
    parser.add_argument('--base', type=float, default=1.0,
                       help='Base plate thickness in mm (default: 1.0)')
    parser.add_argument('--pixel-size', type=float, default=1.5,
                       help='Pixel size in mm (default: 1.5)')
    
    args = parser.parse_args()
    
    # Convert PNG to 3MF
    result = create_vortexcolor_3mf(
        args.input_png,
        args.output_3mf,
        extrusion_height=args.extrusion,
        base_thickness=args.base,
        pixel_size=args.pixel_size
    )
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result.get('success') else 1)


if __name__ == '__main__':
    main()
