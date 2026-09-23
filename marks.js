// The eleven project marks. One 32x32 viewBox, one 1.7px stroke, two tones.
// Shared by the live site and the mockups — edit here, not in a copy.
var MARKS = {
  WebTime: {
    d: 'A timer arc, partly swept',
    svg: '<circle class="s dim" cx="16" cy="16" r="11"/>'
       + '<path class="s lit" d="M16 5 A11 11 0 0 1 25.5 21.5"/>'
       + '<path class="s" d="M16 16 L16 9.5"/>'
       + '<circle class="f" cx="16" cy="16" r="1.6"/>'
  },
  Momus: {
    d: 'A rating with one star knocked out of line',
    svg: (function(){
      // one star, 9.5 wide, around (4.75,4.54). Deep inner radius = sharp points.
      var star='M4.75 0 L6.15 3.29 L9.5 3.66 L6.99 6.14 L7.68 9.71 L4.75 7.84 L1.82 9.71 L2.51 6.14 L0 3.66 L3.35 3.29 Z';
      var out='';
      // two full stars bright; the third slot is the faint tone — the empty socket
      for(var i=0;i<3;i++){
        var cls = i===2 ? 'f dim' : 'f';
        out+='<path class="'+cls+'" d="'+star+'" transform="translate('+(0.9+i*10.1)+',3.2)"/>';
      }
      // three equal-length vertical trails (5.4 each), each stopping ~0.9 above the
      // star's upper edge at that x: arms sit at y≈24.8, the apex at 21.2.
      out+='<path class="s dim" d="M22.0 18.5 L22.0 23.9"/>';
      out+='<path class="s dim" d="M25.85 14.8 L25.85 20.2"/>';
      out+='<path class="s dim" d="M29.6 18.5 L29.6 23.9"/>';
      // fallen straight down out of that third slot, upright, same center x (25.85)
      out+='<path class="f lit" d="'+star+'" transform="translate(21.1,21.2)"/>';
      return out;
    })()
  },
  Chronicle: {
    d: 'Stacked record',
    svg: '<rect class="s dim" x="8" y="4.5" width="16" height="6" rx="1.6"/>'
       + '<rect class="s dim" x="6" y="12.5" width="20" height="6" rx="1.6"/>'
       + '<rect class="s lit" x="4" y="20.5" width="24" height="7" rx="1.8"/>'
       + '<path class="s" style="opacity:.55" d="M8 24 L16 24"/>'
  },
  Ansa: {
    d: 'A tree, down to leaves',
    svg: '<circle class="f lit" cx="16" cy="6" r="2.2"/>'
       + '<path class="s" d="M16 8.5 L16 12 M16 12 L8 12 L8 15 M16 12 L24 12 L24 15"/>'
       + '<circle class="f" cx="8" cy="17" r="1.9"/>'
       + '<circle class="f" cx="24" cy="17" r="1.9"/>'
       + '<path class="s dim" d="M8 19 L8 22 M8 22 L4 22 L4 24.5 M8 22 L12 22 L12 24.5"/>'
       + '<circle class="f dim" cx="4" cy="26" r="1.6"/>'
       + '<circle class="f dim" cx="12" cy="26" r="1.6"/>'
       + '<path class="s dim" d="M24 19 L24 24.5"/>'
       + '<circle class="f dim" cx="24" cy="26" r="1.6"/>'
  },
  Winnow: {
    d: 'A distribution, one clear',
    svg: '<path class="s dim" d="M4 26 L4 21"/>'
       + '<path class="s dim" d="M8.4 26 L8.4 17"/>'
       + '<path class="s dim" d="M12.8 26 L12.8 12"/>'
       + '<path class="s dim" d="M17.2 26 L17.2 15"/>'
       + '<path class="s dim" d="M21.6 26 L21.6 19"/>'
       + '<path class="s lit" style="stroke-width:2.6" d="M26 26 L26 6"/>'
       + '<path class="s" d="M2 28.5 L29 28.5" style="opacity:.35"/>'
  },
  Etymon: {
    d: 'Words to a shared root',
    svg: '<circle class="f dim" cx="5" cy="7" r="1.9"/>'
       + '<circle class="f dim" cx="16" cy="5" r="1.9"/>'
       + '<circle class="f dim" cx="27" cy="7" r="1.9"/>'
       + '<path class="s dim" d="M5 9 C6 16 12 18 15 20"/>'
       + '<path class="s dim" d="M16 7 L16 19"/>'
       + '<path class="s dim" d="M27 9 C26 16 20 18 17 20"/>'
       + '<circle class="f lit" cx="16" cy="23" r="3.2"/>'
  },
  Sundial: {
    d: 'A gnomon and its shadow',
    svg: '<path class="s dim" d="M3 24 L29 24"/>'
       + '<path class="s lit" d="M16 24 L16 7"/>'
       + '<path class="s" d="M16 24 L26.5 20.5" style="opacity:.55"/>'
       + '<path class="s dim" d="M7.5 21 L9 22.4 M16 19.5 L16 21.5 M24.5 21 L23 22.4"/>'
       + '<circle class="f" cx="16" cy="7" r="1.7"/>'
  },
  ReSign: {
    d: 'A cycle, closed before it lapses',
    // the two-arrow reset icon: two clockwise arcs (sweep flag 1) around center
    // (16,17), r=10. The whole ring is rotated 15° clockwise so the two gaps sit
    // on the check's extended diagonal, and each head's tip aims at the next
    // arrow's tail — so the eye follows tip → tail → tip around the cycle.
    svg: '<path class="s lit" d="M7.71 22.59 A10 10 0 0 1 17.91 7.18"/>'
       + '<path class="s lit" d="M24.29 11.41 A10 10 0 0 1 14.09 26.82"/>'
       // solid heads: isosceles (both edges 5.33), an exact point-reflection pair,
       // so they read symmetric; base 4.6 wide to hold up at 40px.
       + '<path class="f lit" d="M21.91 9.83 L16.64 9.10 L19.18 5.27 Z"/>'
       + '<path class="f lit" d="M10.09 24.17 L15.36 24.90 L12.82 28.73 Z"/>'
       // check sits inside the ring, not mirrored — a flipped check reads backwards
       + '<path class="s" style="opacity:.62" d="M12.6 16.4 L15.3 19.1 L20.1 13.9"/>'
  },
  Somnya: {
    d: 'A slow wave, overnight',
    svg: '<path class="s dim" d="M22.5 3.5 A5 5 0 1 0 27.8 7.9 A3.9 3.9 0 0 1 22.5 3.5 Z"/>'
       + '<path class="s lit" d="M3 19 C7 11, 11 11, 15 19 S23 27, 27 19"/>'
       + '<path class="s dim" d="M3 25.5 C7 21.5, 11 21.5, 15 25.5 S23 29.5, 27 25.5"/>'
  },
  Timekeep: {
    d: 'A timeline that keeps its gaps',
    svg: '<path class="s dim" d="M3 16 L29 16" style="opacity:.4"/>'
       + '<path class="s lit" style="stroke-width:2.8" d="M5 11.5 L5 20.5"/>'
       + '<path class="s" style="stroke-width:2.8;opacity:.45" d="M10 13 L10 19"/>'
       + '<path class="s lit" style="stroke-width:2.8" d="M17 10 L17 22"/>'
       + '<path class="s" style="stroke-width:2.8;opacity:.45" d="M22 13 L22 19"/>'
       + '<path class="s" style="stroke-width:2.8;opacity:.45" d="M26 13.5 L26 18.5"/>'
  },
  Almanac: {
    d: 'A calendar, one date lit',
    svg: '<rect class="s" x="4.5" y="7" width="23" height="21" rx="3"/>'
       + '<path class="s dim" d="M4.5 13 L27.5 13"/>'
       + '<path class="s" d="M10.5 4.5 L10.5 9 M21.5 4.5 L21.5 9"/>'
       + '<circle class="f dim" cx="10" cy="18" r="1.4"/>'
       + '<circle class="f dim" cx="16" cy="18" r="1.4"/>'
       + '<circle class="f lit" cx="22" cy="18" r="2.4"/>'
       + '<circle class="f dim" cx="10" cy="23" r="1.4"/>'
       + '<circle class="f dim" cx="16" cy="23" r="1.4"/>'
  }
};
