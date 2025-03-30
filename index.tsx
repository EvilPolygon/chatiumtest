import {attachMedia,refresh} from '@app/ui'
import {getThumbnailUrl} from '@app/storage'
import {Heap} from '@app/heap'

const  ImagesTable = Heap.Table('images',{
  filename: Heap.String(),
  image: Heap.ImageFile(), 
  sessionId: Heap.String(),
  elo: Heap.Number()
})

let currentImages

app.screen('/', async (ctx, req) => {

  let records = await ImagesTable.findAll(ctx,{
    where:{
      sessionId: ctx.session.id
    }
  })

  const getTwoImages = (records) => {
    const recLength = records.length;
    const randomIndex = () => Math.floor(Math.random() * records.length);

    const firstIndex = randomIndex();
    //берем две рандомные картинки. если совпали просто дергаем следующую картинку
    let secondIndex = randomIndex();

    if (firstIndex === secondIndex) {
      secondIndex = Math.floor((secondIndex + 1) % recLength)
    }

    currentImages = [records[firstIndex], records[secondIndex]]

    const result = currentImages.map( img => 
          <box onClick={updateElo.apiCall({imgObj: img})}>
            <image src={img.image.getThumbnailSrc(800)}/>
            <text>Рейтинг {img.elo}</text>
          </box>
        );

    return result;
  }

  return (
    <screen title="Лайк">

      <section>
        <button class="primary" onClick={attachMedia({
          mediaType: 'photo',
          submitUrl: uploadRoute.url()
        })}>
          Загрузить картинку
        </button>
      </section>

      <text class="section">Выберите понравившееся</text>

      {
        records.length > 2 ? getTwoImages(records) : <text>Загрузите больше картинок</text>
      }
    </screen>
  )
})

const uploadRoute = app.apiCall('/upload', async(ctx,req) => {
  await ImagesTable.create(ctx,{
    sessionId: ctx.session.id, 
    filename: req.body.file.name,
    image: req.body.file.hash,
    elo: 1200
  })
  return refresh();
})

const updateElo = app.apiCall('/update', async(ctx,req) => {
  const winnerImg = req.body.imgObj;
  const looserImg = currentImages[(currentImages.length + 1) % currentImages.length]

  const winnerElo = winnerImg.elo;
  const looserElo = looserImg.elo;

  const predictedElo = (Ra, Rb) => 1/(1+(10*((Rb-Ra)/400)))

  const winPred = predictedElo(winnerElo, looserElo);
  const loosPred = predictedElo(looserElo, winnerElo);

  const k = 20;

  const newElo = (elo, pred, sa) => elo + k * (sa - pred)

  const newWinnerElo = Math.floor(newElo(winnerElo, winPred, 1));
  const newLooserElo = Math.floor(newElo(looserElo, loosPred, 0));

  await ImagesTable.update(ctx,{
    id: winnerImg.id,
    elo: newWinnerElo
  })

  await ImagesTable.update(ctx,{
    id: looserImg.id,
    elo: newLooserElo
  })
  
  return refresh();
})
