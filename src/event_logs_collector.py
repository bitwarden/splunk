from splunklib.client import connect


def main():
    print('Bitwarden Events Logs app started')
    service = connect(
        host='localhost',
        port=8089,
        username='admin',
        password='password'
    )

    for app in service.apps:
        print(app.name)

    content = service.info
    for key in sorted(content.keys()):
        value = content[key]
        if isinstance(value, list):
            print(f"{key}:")
            for item in value:
                print(f"    {item}")
        else:
            print(f"{key}: {value}")


if __name__ == '__main__':
    main()
