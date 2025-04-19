/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
import {
  library
} from '@fortawesome/fontawesome-svg-core';
import {
  FontAwesomeIcon,
  FontAwesomeLayers
} from '@fortawesome/vue-fontawesome'; // Correct import

import {
  faInstagram
} from '@fortawesome/free-brands-svg-icons';

library.add(faInstagram);

export {
  FontAwesomeIcon,
  FontAwesomeLayers
}; // Export the correctly imported components