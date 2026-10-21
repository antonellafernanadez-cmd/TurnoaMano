from dotenv import load_dotenv
import os
load_dotenv()

password=os.getenv("MYSQL_PASSWORD")
user= os.getenv("MYSQL_USER")
database= os.getenv("MYSQL_DATABASE")
port= os.getenv("MYSQL_PORT")
host= os.getenv("MYSQL_HOST")

DATABASE_CONNECTION_URI = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"