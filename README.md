
WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO

# Cerebro 2

A web-based visualization and debugging platform for NuPIC.

## Usage

Set up [cerebro2.server](https://github.com/numenta/nupic.cerebro2.server) to export your model state.

Then, run:

    cd static
    python -m SimpleHTTPServer 8000

Finally, visit the following URL in your browser:

    http://localhost:8000

### Screenshots

To enable taking screenshots with the `p` keyboard shortcut, open `js/classes/abstract_visualization.js` and uncomment the line under the note about screenshots.
