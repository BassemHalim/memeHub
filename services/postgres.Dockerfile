FROM postgres:13

# Install required packages
RUN apt-get update && apt-get install -y \
    postgresql-contrib \
    hunspell \
    hunspell-ar \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic links for Arabic dictionary files
RUN ln -s /usr/share/hunspell/ar.aff /usr/share/postgresql/13/tsearch_data/arabic.aff && \
    ln -s /usr/share/hunspell/ar.dic /usr/share/postgresql/13/tsearch_data/arabic.dic


# Copy your SQL initialization script
COPY memeService/init.sql /docker-entrypoint-initdb.d/
