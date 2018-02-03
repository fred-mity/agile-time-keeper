# TIME 

## How to install

### Prerequistes

You must have an HTTP server to run the application.

### How to launch the project

With node.js installed, check on :
* https://www.npmjs.com/package/http-server

```bash
http-server
```

With python :
* https://docs.python.org/2/library/simplehttpserver.html

```bash
python -m SimpleHTTPServer 8080
```

and go on localhost:8080

## Configuration

You can set your timer by modifying the data.json file

### Set the title of your meeting

modify the "title" property.

```bash
"title": "My title"
```

### Add a sequence

Add an object in the sequences array.
A sequence must contains three properties (title, duration and color).

```bash
"sequences": [
    {
        "title": "Sequence 1",
        "duration": 1, // 1 = a minute, 0.1 = 6 sec
        "color": "red"
    }
]
```

## Next step

* Add a settings page to manage the progres bar.

## Authors

### Development Lead

* [**Frédéric Faure**](mailto:frederik.faure@gmail.com)

### Co-Author

* [**Nicolas Rouvière**](mailto:zesk06@gmail.com)

## License

This project is under MIT license - see the [LICENSE](LICENSE.md) file for details.
