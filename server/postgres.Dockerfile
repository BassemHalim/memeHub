FROM postgres:15

# Install required packages
RUN apt-get update && apt-get install -y \
    postgresql-contrib \
    hunspell \
    hunspell-ar \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic links for Arabic dictionary files 
# Starting with empty stop words list
RUN ln -s /usr/share/hunspell/ar.aff /usr/share/postgresql/15/tsearch_data/arabic.affix && \
    ln -s /usr/share/hunspell/ar.dic /usr/share/postgresql/15/tsearch_data/arabic.dict && \
    touch /usr/share/postgresql/15/tsearch_data/arabic.stop


# Copy your SQL initialization script
COPY migrations/ /docker-entrypoint-initdb.d/
